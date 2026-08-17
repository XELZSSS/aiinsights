import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { Hono } from "hono";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { registerRoutes } from "@/server/routes";
import type { RouteDef } from "@/server/routes";
import { ApiError, CacheService, HttpClient } from "@/server/core";

export interface Env {
  METRICS?: KVNamespace;
  CACHE_VERSION?: string;
  ASSETS?: Fetcher;
}

export interface AppContext {
  cache: CacheService;
  http: HttpClient;
  version: string;
  log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): void;
}

let sharedHttp: HttpClient | null = null;
let sharedCache: CacheService | null = null;
let sharedCacheVersion: string | null = null;

export function buildContext(env: Env): AppContext {
  const version = env.CACHE_VERSION ?? "v1";
  sharedHttp ??= new HttpClient();
  if (!sharedCache || sharedCacheVersion !== version) {
    sharedCache = new CacheService({ kv: env.METRICS ?? null, version });
    sharedCacheVersion = version;
  }
  return {
    cache: sharedCache,
    http: sharedHttp,
    version,
    log: (level, msg, meta) => {
      const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
      if (level === "error") console.error(`[${level}] ${line}`);
      else if (level === "warn") console.warn(`[${level}] ${line}`);
      else console.log(`[${level}] ${line}`);
    },
  };
}

export function createApp(routeDefs: RouteDef[]): Hono {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", timing());
  app.use("/api/*", timeout(45_000));

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "HEAD", "POST", "OPTIONS"],
      allowHeaders: ["content-type", "authorization"],
      maxAge: 86400,
    }),
  );

  app.use("/api/*", async (c, next) => {
    await next();
    if (c.req.method === "GET" && c.res.status === 200) {
      c.header("Cache-Control", "public, max-age=60");
      c.header("CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=300, stale-if-error=86400");
    }
  });

  registerRoutes(app, routeDefs);

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      const status = (err.status >= 100 && err.status < 600 ? err.status : 500) as ContentfulStatusCode;
      return c.json({ error: { code: status, message: err.message } }, status);
    }
    console.error("[unhandled]", err);
    return c.json({ error: { code: 500, message: "Internal server error" } }, 500);
  });

  app.notFound((c) => c.json({ error: { code: 404, message: "API route not found" } }, 404));

  return app;
}
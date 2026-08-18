import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { Hono } from "hono";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { registerRoutes } from "@/server/routes";
import type { RouteDef } from "@/server/routes";
import { ApiError } from "@/server/core/errors";
import { CacheService } from "@/server/core/cache";
import { HttpClient } from "@/server/core/http";

export interface Env {
  METRICS?: KVNamespace;
  ASSETS?: Fetcher;
}

export interface AppContext {
  cache: CacheService;
  http: HttpClient;
  version: string;
  kv: KVNamespace | null;
  log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): void;
}

let sharedHttp: HttpClient | null = null;
let sharedCache: CacheService | null = null;

export function buildContext(env: Env): AppContext {
  sharedHttp ??= new HttpClient();
  sharedCache ??= new CacheService({ kv: env.METRICS ?? null, version: "v1" });
  return {
    cache: sharedCache,
    http: sharedHttp,
    version: "v1",
    kv: env.METRICS ?? null,
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
  app.use("/api/*", timeout(90_000));

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "HEAD", "POST", "OPTIONS"],
      allowHeaders: ["content-type"],
      maxAge: 86400,
    }),
  );

  app.use("/api/*", async (c, next) => {
    await next();
    if (c.req.method === "GET" && c.res.status === 200) {
      const noStore = c.req.path === "/api/sources-status";
      c.header("Cache-Control", noStore ? "no-store, max-age=0" : "public, max-age=60");
      c.header(
        "CDN-Cache-Control",
        noStore ? "no-store" : "public, max-age=300, stale-while-revalidate=300, stale-if-error=86400",
      );
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

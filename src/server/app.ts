import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { Hono } from "hono";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { registerRoutes } from "./routes/register";
import type { RouteDef } from "./routes/register";
import { ApiError } from "./core";

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

  // Data changes at most once per cache TTL (5 min); the upstream TTLs are the
  // source of truth. With Workers Cache (cache.enabled in wrangler.jsonc):
  //   - Cache-Control (browser): fresh for 60s, then revalidate.
  //   - CDN-Cache-Control (edge): fresh for 5 min, then serve stale while the
  //     Worker revalidates in the background (stale-while-revalidate); if the
  //     origin/upstream fails, keep serving the last good response for a day
  //     (stale-if-error) instead of surfacing an error to users.
  // Note: s-maxage / must-revalidate / proxy-revalidate would disable SWR and
  // stale-if-error, so the edge TTL lives in CDN-Cache-Control instead.
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

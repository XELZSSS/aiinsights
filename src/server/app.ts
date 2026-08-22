import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { logger } from "hono/logger";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { registerRoutes } from "@/server/routes";
import type { RouteDef } from "@/server/routes";
import { ApiError } from "@/server/core/errors";

/** Clamp an error status to a contentful HTTP status code for JSON responses. */
function clampStatus(status: number): ContentfulStatusCode {
  return (status >= 100 && status < 600 ? status : 500) as ContentfulStatusCode;
}

/** Build the Hono API app: logging/timing/timeout/CORS middleware plus the declarative route table. */
export function createApp(routeDefs: readonly RouteDef[]): Hono {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", timing());
  app.use("/api/*", timeout(90_000));

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "HEAD", "OPTIONS"],
      allowHeaders: ["content-type"],
      maxAge: 86400,
    }),
  );

  registerRoutes(app, routeDefs);

  app.onError((err, c) => {
    // Map known API errors to their HTTP status; anything else is treated as an unexpected 500.
    if (err instanceof ApiError) {
      const status = clampStatus(err.status);
      return c.json({ error: { code: status, message: err.message } }, status);
    }
    console.error("[unhandled]", err);
    return c.json({ error: { code: 500, message: "Internal server error" } }, 500);
  });

  app.notFound((c) => c.json({ error: { code: 404, message: "API route not found" } }, 404));

  return app;
}

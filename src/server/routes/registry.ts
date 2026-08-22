import type { Context, Hono } from "hono";
import { startTime, endTime } from "hono/timing";
import { buildContext } from "@/server/context";
import type { Env } from "@/server/context";
import { validateQuery } from "@/server/core/validate";
import type { RouteDef } from "./types";

const BROWSER_CACHE_HEADER = "public, max-age=60";
const BROWSER_NO_STORE_HEADER = "no-store, max-age=0";
const CDN_CACHE_HEADER = "public, max-age=300, stale-while-revalidate=300, stale-if-error=86400";
const CDN_NO_STORE_HEADER = "no-store";

function requestContext(c: Context): ReturnType<typeof buildContext> {
  return buildContext(c.env as Env);
}

function applyCacheHeaders(c: Context, noStore: boolean): void {
  c.header("Cache-Control", noStore ? BROWSER_NO_STORE_HEADER : BROWSER_CACHE_HEADER);
  c.header("CDN-Cache-Control", noStore ? CDN_NO_STORE_HEADER : CDN_CACHE_HEADER);
}

/** Register every route on the Hono app: validate query params, run the handler, and stamp cache headers. */
export function registerRoutes(app: Hono, routes: readonly RouteDef[]): void {
  for (const route of routes) {
    app.get(route.path, async (c) => {
      const context = requestContext(c);
      startTime(c, "upstream");
      try {
        // Query params are validated against the route's schema before the handler runs.
        const params = validateQuery(c.req.query(), route.query ?? {});
        const data = await route.handler(context, params);
        if (c.req.method === "GET") {
          // Live-state routes opt out of caching; everything else gets short browser + longer CDN caching.
          applyCacheHeaders(c, route.noStore === true);
        }
        return c.json({ data });
      } finally {
        endTime(c, "upstream");
      }
    });
  }
}

import type { Hono } from "hono";
import type { Context } from "hono";
import { startTime, endTime } from "hono/timing";
import type { AppContext } from "../context";
import { buildContext } from "../context";
import { validateQuery, type QuerySpec } from "../core";

export interface RouteDef<P extends Record<string, string> = Record<string, string>> {
  path: string;
  query?: { [K in keyof P]: QuerySpec };
  handler(ctx: AppContext, params: P): Promise<unknown>;
}

function ctx(c: Context): AppContext {
  return buildContext(c.env as AppContext["env"]);
}

export function registerRoutes(app: Hono, routes: RouteDef[]): void {
  for (const route of routes) {
    app.get(route.path, async (c) => {
      const context = ctx(c);
      startTime(c, "upstream");
      const params = validateQuery(c.req.query(), route.query ?? {});
      const data = await route.handler(context, params as Record<string, string>);
      endTime(c, "upstream");
      return c.json({ data });
    });
  }
}

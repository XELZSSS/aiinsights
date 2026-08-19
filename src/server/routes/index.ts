import type { Hono } from "hono";
import type { Context } from "hono";
import { startTime, endTime } from "hono/timing";
import type { AppContext } from "@/server/app";
import { buildContext } from "@/server/app";
import type { Env } from "@/server/app";
import { validateQuery, type QuerySpec } from "@/server/core/validate";
import { getArenaLeaderboard } from "@/server/sources/arena";
import { getIntelligenceIndex } from "@/server/sources/artificial-analysis";
import { getModels, getReleases } from "@/server/sources/huggingface";
import { getHomeDashboard } from "@/server/sources/home";
import { getNews } from "@/server/sources/news";
import { getOpenRouterRankings } from "@/server/sources/openrouter";
import { getSourcesStatusFull } from "@/server/sources/status";
import { ARENA_CATEGORIES } from "@/shared/config";
import type { ArenaCategory, NewsCategory } from "@/shared/types";

export interface RouteDef<P extends Record<string, string> = Record<string, string>, R = unknown> {
  path: string;
  query?: { [K in keyof P]: QuerySpec };
  warm?: boolean;
  handler(ctx: AppContext, params: P): Promise<R>;
}

function ctx(c: Context): AppContext {
  return buildContext(c.env as Env);
}

export function registerRoutes(app: Hono, routes: RouteDef[]): void {
  for (const route of routes) {
    app.get(route.path, async (c) => {
      const context = ctx(c);
      startTime(c, "upstream");
      try {
        const params = validateQuery(c.req.query(), route.query ?? {});
        const data = await route.handler(context, params as Record<string, string>);
        return c.json({ data });
      } finally {
        endTime(c, "upstream");
      }
    });
  }
}

export function buildWarmUrls(base: string): string[] {
  return routeDefs.flatMap((route) => {
    const specs = route.query ?? {};
    const entries = Object.entries(specs);
    let combos: Record<string, string>[] = [{}];

    if (route.warm) {
      for (const [name, spec] of entries) {
        if (spec.type !== "enum") continue;
        combos = combos.flatMap((combo) => spec.values.map((v) => ({ ...combo, [name]: v })));
      }
      for (const [name, spec] of entries) {
        if (spec.type === "enum" || spec.default === undefined) continue;
        for (const combo of combos) if (combo[name] === undefined) combo[name] = spec.default;
      }
    } else {
      for (const [name, spec] of entries) {
        const defaultVal = spec.default;
        if (defaultVal === undefined) continue;
        const combo = combos[0]!;
        combo[name] = defaultVal;
      }
    }

    return combos.map((combo) => {
      const qs = new URLSearchParams(combo).toString();
      return `${base}${route.path}${qs ? `?${qs}` : ""}`;
    });
  });
}

export const routeDefs: RouteDef[] = [
  {
    path: "/api/arena-leaderboard",
    query: { category: { type: "enum", values: [...ARENA_CATEGORIES], default: "text" } },
    warm: true,
    handler: (ctx, params) => getArenaLeaderboard(ctx, { category: params.category as ArenaCategory }),
  },
  {
    path: "/api/artificial-analysis-index",
    handler: (ctx) => getIntelligenceIndex(ctx, {}),
  },
  {
    path: "/api/open-source-models",
    query: {
      sort: {
        type: "enum",
        values: ["trendingScore", "downloads", "likes", "createdAt", "lastModified"],
        default: "trendingScore",
      },
      direction: { type: "enum", values: ["-1", "1"], default: "-1" },
      limit: { type: "number", default: "500", min: 1, max: 500 },
    },
    handler: (ctx, params) =>
      getModels(ctx, {
        sort: params.sort ?? "trendingScore",
        direction: params.direction ?? "-1",
        limit: Number(params.limit ?? 500),
      }),
  },
  {
    path: "/api/open-source-releases",
    handler: (ctx) => getReleases(ctx, {}),
  },
  {
    path: "/api/news",
    query: {
      category: { type: "enum", values: ["industry", "opensource", "hardware", "funding"], default: "industry" },
    },
    warm: true,
    handler: (ctx, params) => getNews(ctx, { category: params.category as NewsCategory }),
  },
  {
    path: "/api/openrouter-rankings",
    handler: (ctx) => getOpenRouterRankings(ctx, {}),
  },
  {
    path: "/api/sources-status",
    query: { refresh: { type: "enum", values: ["1", "0"], default: "0" } },
    warm: false,
    handler: (ctx, params) => getSourcesStatusFull(ctx, params.refresh === "1"),
  },
  {
    path: "/api/home-dashboard",
    handler: (ctx) => getHomeDashboard(ctx),
  },
];

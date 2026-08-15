import type { Hono } from "hono";
import type { Context } from "hono";
import { startTime, endTime } from "hono/timing";
import type { AppContext } from "@/server/app";
import { buildContext } from "@/server/app";
import { validateQuery, type QuerySpec, settled } from "@/server/core";
import { getArenaLeaderboard } from "@/server/sources/misc";
import { getIntelligenceIndex } from "@/server/sources/aa";
import { getModels, getReleases } from "@/server/sources/huggingface";
import { getNews } from "@/server/sources/news";
import { getOpenRouterRankings } from "@/server/sources/openrouter";
import { getPredictions } from "@/server/sources/polymarket";
import { checkAllUpstreams, getSystemStats } from "@/server/sources/misc";
import { getTtsLeaderboard } from "@/server/sources/aa";
import { ARENA_CATEGORIES } from "@/shared/config";

export interface RouteDef<P extends Record<string, string> = Record<string, string>, R = unknown> {
  path: string;
  query?: { [K in keyof P]: QuerySpec };
  handler(ctx: AppContext, params: P): Promise<R>;
}

function ctx(c: Context): AppContext {
  return buildContext(c.env as AppContext["env"]);
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

export const routeDefs: RouteDef[] = [
  {
    path: "/api/arena-leaderboard",
    query: { category: { type: "enum", values: [...ARENA_CATEGORIES], default: "text" } },
    handler: (ctx, params) => getArenaLeaderboard(ctx, { category: params.category ?? "text" }),
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
    handler: async (ctx, params) => {
      const limit = Number(params.limit ?? 500);
      const models = await getModels(ctx, {
        sort: params.sort ?? "trendingScore",
        direction: params.direction ?? "-1",
        limit,
      });
      return models.slice(0, limit);
    },
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
    handler: (ctx, params) => getNews(ctx, { category: params.category ?? "industry" }),
  },
  {
    path: "/api/openrouter-rankings",
    handler: (ctx) => getOpenRouterRankings(ctx, {}),
  },
  {
    path: "/api/predictions",
    handler: (ctx) => getPredictions(ctx, {}),
  },
  {
    path: "/api/tts-leaderboard",
    handler: (ctx) => getTtsLeaderboard(ctx, {}),
  },
  {
    path: "/api/health",
    handler: (ctx) => checkAllUpstreams(ctx, {}),
  },
  {
    path: "/api/system-stats",
    handler: (ctx) => getSystemStats(ctx, {}),
  },
  {
    path: "/api/home-dashboard",
    handler: async (ctx: AppContext) => {
      const [orRankings, arena, opensource, tts, predictions] = await Promise.allSettled([
        getOpenRouterRankings(ctx, {}),
        getArenaLeaderboard(ctx, { category: "text-to-image" }),
        getModels(ctx, { sort: "trendingScore", direction: "-1", limit: 500 }),
        getTtsLeaderboard(ctx, {}),
        getPredictions(ctx, {}),
      ]);
      return {
        orRankings: settled(orRankings, null),
        arena: settled(arena, null),
        opensource: settled(opensource, null),
        tts: settled(tts, null),
        predictions: settled(predictions, null),
      };
    },
  },
];
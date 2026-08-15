import type { RouteDef } from "./register";
import type { AppContext } from "../context";
import { getArenaLeaderboard } from "../sources/arena";
import { getIntelligenceIndex } from "../sources/aa";
import { getModels, getReleases } from "../sources/huggingface";
import { getNews } from "../sources/news";
import { getOpenRouterRankings } from "../sources/openrouter";
import { getPredictions } from "../sources/polymarket";
import { checkAllUpstreams } from "../sources/misc";
import { getSystemStats } from "../sources/misc";
import { getTtsLeaderboard } from "../sources/aa";
import { settled } from "../sources/misc";
import { ARENA_CATEGORIES } from "../../shared/config";

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
      sort: { type: "enum", values: ["trendingScore", "downloads", "likes", "createdAt", "lastModified"], default: "trendingScore" },
      direction: { type: "enum", values: ["-1", "1"], default: "-1" },
      limit: { type: "number", default: "500", min: 1, max: 500 },
    },
    handler: (ctx, params) => getModels(ctx, { sort: params.sort ?? "trendingScore", direction: params.direction ?? "-1", limit: Number(params.limit ?? 500) }),
  },
  {
    path: "/api/open-source-releases",
    handler: (ctx) => getReleases(ctx, {}),
  },
  {
    path: "/api/news",
    query: { category: { type: "enum", values: ["industry", "opensource", "hardware", "funding"], default: "industry" } },
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

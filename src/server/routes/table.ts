import { getArenaLeaderboard } from "@/server/sources/arena";
import { getIntelligenceIndex } from "@/server/sources/artificial-analysis";
import { getModels, getReleases } from "@/server/sources/huggingface";
import { getHomeDashboard } from "@/server/sources/home";
import { getNews } from "@/server/sources/news";
import { getOpenRouterRankings } from "@/server/sources/openrouter";
import { getSourcesStatusFull } from "@/server/sources/status";
import { ARENA_CATEGORIES, rssConfig } from "@/shared/config";
import type { NewsCategory } from "@/shared/types";
import { qEnum, qNum } from "@/server/core/validate";
import { defineRoute } from "./types";

const OPEN_SOURCE_SORTS = ["trendingScore", "downloads", "likes", "createdAt", "lastModified"] as const;
const SORT_DIRECTIONS = ["-1", "1"] as const;
const REFRESH_FLAGS = ["1", "0"] as const;

// rssConfig is keyed by NewsCategory; freeze the key order so the enum spec and its default are stable.
const NEWS_CATEGORIES = Object.keys(rssConfig) as NewsCategory[];

// Route table: every endpoint registered on the app and warmed on the scheduled trigger.
export const routeDefs = [
  defineRoute({
    path: "/api/arena-leaderboard",
    query: { category: qEnum(ARENA_CATEGORIES, "text") },
    warm: true,
    handler: (ctx, params) => getArenaLeaderboard(ctx, { category: params.category }),
  }),
  defineRoute({
    path: "/api/artificial-analysis-index",
    handler: (ctx) => getIntelligenceIndex(ctx, {}),
  }),
  defineRoute({
    path: "/api/open-source-models",
    query: {
      sort: qEnum(OPEN_SOURCE_SORTS, "trendingScore"),
      direction: qEnum(SORT_DIRECTIONS, "-1"),
      limit: qNum({ default: "500", min: 1, max: 500 }),
    },
    // validateQuery has already applied schema defaults; no fallbacks needed here.
    handler: (ctx, params) =>
      getModels(ctx, {
        sort: params.sort,
        direction: params.direction,
        limit: Number(params.limit),
      }),
  }),
  defineRoute({
    path: "/api/open-source-releases",
    handler: (ctx) => getReleases(ctx, {}),
  }),
  defineRoute({
    path: "/api/news",
    query: { category: qEnum(NEWS_CATEGORIES, NEWS_CATEGORIES[0]) },
    warm: true,
    handler: (ctx, params) => getNews(ctx, { category: params.category }),
  }),
  defineRoute({
    path: "/api/openrouter-rankings",
    handler: (ctx) => getOpenRouterRankings(ctx, {}),
  }),
  defineRoute({
    path: "/api/sources-status",
    query: { refresh: qEnum(REFRESH_FLAGS, "0") },
    warm: false,
    // Live probe results must not be cached by browsers or the CDN.
    noStore: true,
    handler: (ctx, params) => getSourcesStatusFull(ctx, params.refresh === "1"),
  }),
  defineRoute({
    path: "/api/home-dashboard",
    handler: (ctx) => getHomeDashboard(ctx),
  }),
];

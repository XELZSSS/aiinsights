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
import { ARENA_CATEGORIES, rssConfig } from "@/shared/config";
import type { ArenaCategory, NewsCategory } from "@/shared/types";

/** Declarative route descriptor: path, optional query schema (validated per request), cache policy, and the handler. */
export interface RouteDef<P extends Record<string, string> = Record<string, string>, R = unknown> {
  path: string;
  query?: { [K in keyof P]: QuerySpec };
  warm?: boolean;
  /** Skip browser/CDN caching for responses that must reflect live state (e.g. probe results). */
  noStore?: boolean;
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
        // Query params are validated against the route's schema before the handler runs.
        const params = validateQuery(c.req.query(), route.query ?? {});
        const data = await route.handler(context, params as Record<string, string>);
        if (c.req.method === "GET") {
          // Live-state routes opt out of caching; everything else gets short browser + longer CDN caching.
          c.header("Cache-Control", route.noStore ? "no-store, max-age=0" : "public, max-age=60");
          c.header(
            "CDN-Cache-Control",
            route.noStore ? "no-store" : "public, max-age=300, stale-while-revalidate=300, stale-if-error=86400",
          );
        }
        return c.json({ data });
      } finally {
        endTime(c, "upstream");
      }
    });
  }
}

/** Expand each route into concrete warmup URLs: cartesian product of enum params filled with defaults; non-warm routes use defaults only. */
export function buildWarmUrls(base: string): string[] {
  return routeDefs.flatMap((route) => {
    const specs = route.query ?? {};
    const entries = Object.entries(specs);
    let combos: Record<string, string>[] = [{}];

    if (route.warm) {
      // Enumerate every combination of enum-valued params so each variant is warmed.
      for (const [name, spec] of entries) {
        if (spec.type !== "enum") continue;
        combos = combos.flatMap((combo) => spec.values.map((v) => ({ ...combo, [name]: v })));
      }
      // Fill any remaining params with their defaults.
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

// Route table: every endpoint registered on the app and warmed on the scheduled trigger.
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
    // validateQuery has already applied schema defaults; no fallbacks needed here.
    handler: (ctx, params) =>
      getModels(ctx, {
        sort: params.sort!,
        direction: params.direction!,
        limit: Number(params.limit),
      }),
  },
  {
    path: "/api/open-source-releases",
    handler: (ctx) => getReleases(ctx, {}),
  },
  {
    path: "/api/news",
    query: {
      category: {
        type: "enum",
        values: Object.keys(rssConfig),
        default: Object.keys(rssConfig)[0],
      },
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
    // Live probe results must not be cached by browsers or the CDN.
    noStore: true,
    handler: (ctx, params) => getSourcesStatusFull(ctx, params.refresh === "1"),
  },
  {
    path: "/api/home-dashboard",
    handler: (ctx) => getHomeDashboard(ctx),
  },
];

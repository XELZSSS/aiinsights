import { HEALTH_TIMEOUT_MS, HEALTH_TTL_MS, HEALTH_PROBES, START_MARKER_TTL_MS, upstreamConfig, DEFAULT_TTL_MS } from "@/shared/config";
import type { ArenaModel, ArenaPayload, HealthEntry, SystemStats } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { createSource } from "@/server/core";
import { parseRscScriptArray } from "@/server/parser";

const BASE = upstreamConfig.arena;

interface RawEntry {
  rank: number;
  modelDisplayName?: string;
  score?: number;
  rating?: number;
  votes?: number;
  modelOrganization?: string;
  license?: string;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
  contextLength?: number;
}

function mapEntry(e: RawEntry): ArenaModel | null {
  if (e.rank == null || !e.modelDisplayName) return null;
  return {
    model: e.modelDisplayName,
    score: e.score ?? e.rating ?? null,
    votes: e.votes ?? null,
    license: e.license ?? null,
    inputPricePerMillion: e.inputPricePerMillion ?? null,
    outputPricePerMillion: e.outputPricePerMillion ?? null,
    contextLength: e.contextLength ?? null,
  };
}

export const getArenaLeaderboard = createSource<{ category: string }, ArenaPayload>({
  cacheKey: (p) => `arena-leaderboard:${p.category}`,
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext, params) => {
    const { category } = params;
    const html = await ctx.http.text(`${BASE}/${encodeURIComponent(category)}`);
    const raw = parseRscScriptArray<RawEntry>(html, "entries");
    const models = raw.map(mapEntry).filter((m): m is ArenaModel => m !== null);
    if (models.length === 0) {
      const head = html.slice(0, 200).replace(/\s+/g, " ").trim();
      throw new Error(
        `Arena RSC parsing failed for category "${category}". html length=${html.length}, hasEntriesMarker=${html.includes('"entries"')}, head="${head}"`,
      );
    }
    return { data: { category, fetched_at: new Date().toISOString(), models } };
  },
});

async function probe(ctx: AppContext, name: string, url: string, apiPath?: string): Promise<HealthEntry> {
  try {
    const { responseTime, statusCode } = await ctx.http.probe(url, HEALTH_TIMEOUT_MS);
    return { name, status: "ok", detail: "reachable", responseTime, statusCode, url: apiPath || url };
  } catch (e: unknown) {
    return {
      name,
      status: "error",
      detail: e instanceof Error ? e.message : "unknown error",
      responseTime: 0,
      statusCode: null,
      url: apiPath || url,
    };
  }
}

export const checkAllUpstreams = createSource<Record<string, never>, HealthEntry[]>({
  cacheKey: () => "health",
  defaultTtl: HEALTH_TTL_MS,
  fetch: (ctx: AppContext) =>
    Promise.all(HEALTH_PROBES.map((p) => probe(ctx, p.name, p.url, p.apiPath))).then((data) => ({ data })),
});

const START_KEY = "system:start-ts";

export const getSystemStats = createSource<Record<string, never>, SystemStats>({
  cacheKey: () => "system-stats",
  defaultTtl: 60_000,
  fetch: async (ctx: AppContext) => {
    const stored = await ctx.cache.get<number>(START_KEY);
    const startTime = stored !== undefined && stored > 0 ? stored : ctx.now();
    if (stored === undefined) {
      try {
        await ctx.cache.set(START_KEY, startTime, START_MARKER_TTL_MS);
      } catch {
        void 0;
      }
    }
    return {
      data: {
        runtime: ctx.env.METRICS ? "cloudflare" : "standard",
        uptime: Math.max(0, Math.floor((ctx.now() - startTime) / 1000)),
      },
      ttl: 60_000,
    };
  },
});
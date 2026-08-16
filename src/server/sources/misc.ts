import { upstreamConfig, DEFAULT_TTL_MS } from "@/shared/config";
import type { ArenaModel, ArenaPayload } from "@/shared/types";
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
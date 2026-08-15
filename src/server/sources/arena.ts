import { upstreamConfig, DEFAULT_TTL_MS, ARENA_CATEGORIES } from "../../shared/config";
import { ValidationError } from "../core";
import { parseRscScriptArray } from "../parser";
import type { ArenaModel, ArenaPayload } from "../../shared/types";
import { createSource } from "./misc";
import type { AppContext } from "../context";

const BASE = upstreamConfig.arena;
const ALLOWED_CATEGORIES = new Set<string>(ARENA_CATEGORIES);

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
    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new ValidationError(`Invalid arena category "${category}". Valid: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
    }
    const html = await ctx.http.text(`${BASE}/${encodeURIComponent(category)}`);
    const raw = parseRscScriptArray<RawEntry>(html, "entries");
    const models = raw.map(mapEntry).filter((m): m is ArenaModel => m !== null);
    if (models.length === 0) {
      const head = html.slice(0, 200).replace(/\s+/g, " ").trim();
      throw new Error(`Arena RSC parsing failed for category "${category}". html length=${html.length}, hasEntriesMarker=${html.includes('"entries"')}, head="${head}"`);
    }
    return { data: { category, fetched_at: new Date().toISOString(), models } };
  },
});

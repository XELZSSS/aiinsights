import { upstreamConfig, DEFAULT_TTL_MS, cacheKeys } from "@/shared/config";
import type { ArenaModel, ArenaPayload, ArenaCategory } from "@/shared/types";
import type { AppContext } from "@/server/context";
import { createSource } from "@/server/core/source";
import { extractRscScripts, findNextData, parseRscPayload } from "@/server/parsers/rsc";

const BASE = upstreamConfig.arena;

interface RawEntry {
  rank: number;
  modelDisplayName?: string;
  rating?: number;
  ratingUpper?: number;
  ratingLower?: number;
  votes?: number;
  license?: string;
  modelOrganization?: string;
  modelUrl?: string;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
  contextLength?: number;
  pricePerImage?: number;
  isDay1?: boolean;
}

function mapEntry(e: RawEntry): ArenaModel | null {
  if (e.rank == null || e.rank <= 0 || e.isDay1 === true || !e.modelDisplayName) return null;
  return {
    model: e.modelDisplayName,
    rating: e.rating ?? null,
    ratingUpper: e.ratingUpper ?? null,
    ratingLower: e.ratingLower ?? null,
    votes: e.votes ?? null,
    license: e.license ?? null,
    modelOrganization: e.modelOrganization ?? null,
    modelUrl: e.modelUrl ?? null,
    inputPricePerMillion: e.inputPricePerMillion ?? null,
    outputPricePerMillion: e.outputPricePerMillion ?? null,
    contextLength: e.contextLength ?? null,
    pricePerImage: e.pricePerImage ?? null,
  };
}

export const getArenaLeaderboard = createSource<{ category: ArenaCategory }, ArenaPayload>({
  cacheKey: (p) => cacheKeys.arenaLeaderboard(p.category),
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext, params) => {
    const { category } = params;
    const html = await ctx.http.text(`${BASE}/${encodeURIComponent(category)}`);
    const raw = parseRscPayload<RawEntry>(extractRscScripts(html), "entries", (tree) => findNextData(tree, "entries"));
    const models = raw.map(mapEntry).filter((m): m is ArenaModel => m !== null);
    if (models.length === 0) {
      const head = html.slice(0, 200).replace(/\s+/g, " ").trim();
      throw new Error(
        `Arena RSC parsing failed for category "${category}". html length=${html.length}, hasEntriesMarker=${html.includes('"entries"')}, head="${head}"`,
      );
    }
    return { data: { category, models } };
  },
});

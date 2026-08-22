import { upstreamConfig, DEFAULT_TTL_MS, cacheKeys } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { AppContext } from "@/server/context";
import { findNextData, parseRscPayload } from "@/server/parsers/rsc";
import { createSource } from "@/server/core/source";
import { errMsg } from "@/server/core/utils";
import {
  compact,
  compactOmniscienceEnrich,
  compactLeaderboardEnrich,
  findLeaderboardModels,
  mergeBySlug,
} from "./mapping";

// RSC request headers make Next.js serve raw flight payloads instead of rendered HTML.
const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%5D" } as const;

const INDEX_PATH = "/evaluations/artificial-analysis-intelligence-index";
const MODELS_PATH = "/models";
const OMNISCIENCE_PATH = "/evaluations/omniscience";
const LEADERBOARD_PATH = "/leaderboards/models";

async function fetchAaRsc(ctx: AppContext, path: string): Promise<string> {
  return ctx.http.text(`${upstreamConfig.artificialAnalysis}${path}`, {
    headers: { ...RSC_HEADERS },
    retries: 0,
    timeoutMs: 30_000,
  });
}

/**
 * Run an optional enrichment fetch; a failure only logs a warning and yields an
 * empty list so the main catalog can still be served.
 */
async function tryEnrich(
  ctx: AppContext,
  label: string,
  fn: () => Promise<Record<string, unknown>[]>,
): Promise<Record<string, unknown>[]> {
  try {
    return await fn();
  } catch (err) {
    ctx.log("warn", `[artificial] ${label} enrichment failed: ${errMsg(err)}`);
    return [];
  }
}

export const getIntelligenceIndex = createSource<Record<string, never>, ArtificialAnalysisModel[]>({
  cacheKey: () => cacheKeys.intelligenceIndex,
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const indexBody = await fetchAaRsc(ctx, INDEX_PATH);
    const indexModels = parseRscPayload<Record<string, unknown>>(indexBody, "initialModels", (tree) =>
      findNextData(tree, "initialModels"),
    );
    const catalog = parseRscPayload<Record<string, unknown>>(indexBody, "models", (tree) => {
      const arr = findNextData<Record<string, unknown>>(tree, "models");
      return Array.isArray(arr) && arr.length > 100 ? arr : null;
    });

    const modelsPageModels = await tryEnrich(ctx, "/models", async () =>
      parseRscPayload<Record<string, unknown>>(await fetchAaRsc(ctx, MODELS_PATH), "initialModels", (tree) =>
        findNextData(tree, "initialModels"),
      ),
    );

    const omniscienceEnrich = await tryEnrich(ctx, "omniscience", async () => {
      const omniscienceBody = await fetchAaRsc(ctx, OMNISCIENCE_PATH);
      const omniscienceModels = parseRscPayload<Record<string, unknown>>(omniscienceBody, "initialModels", (tree) => {
        const arr = findNextData<Record<string, unknown>>(tree, "initialModels");
        return Array.isArray(arr) && arr.some((m) => m.omniscienceBreakdown != null) ? arr : null;
      });
      return (omniscienceModels ?? []).map(compactOmniscienceEnrich);
    });

    const leaderboardEnrich = await tryEnrich(ctx, "leaderboard", async () => {
      const leaderboardBody = await fetchAaRsc(ctx, LEADERBOARD_PATH);
      const leaderboardModels = parseRscPayload<Record<string, unknown>>(
        leaderboardBody,
        "models",
        findLeaderboardModels,
      );
      return (leaderboardModels ?? []).map(compactLeaderboardEnrich);
    });

    const models = mergeBySlug(catalog, indexModels, modelsPageModels, omniscienceEnrich, leaderboardEnrich)
      .map(compact)
      .sort((a, b) => (b.intelligence_index ?? -Infinity) - (a.intelligence_index ?? -Infinity));
    const invalid = models.filter((m) => !m.slug || !m.name);
    if (invalid.length > 0) ctx.log("warn", `[artificial] ${invalid.length} models with empty slug/name after mapping`);
    return { data: models };
  },
});

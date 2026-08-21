import { useMemo } from "react";
import type { ArtificialAnalysisModel, HallucinationRankingEntry } from "@/shared/types";
import { normalizePercent } from "@/shared/utils";
import { useSuspenseArtificialRankings } from "@/app/api/queries";

// One entry per model that has an omniscience breakdown; models without one are skipped.
// Sorted by accuracy descending so the most reliable models rank first.
function buildHallucinationRankings(models: ArtificialAnalysisModel[]): HallucinationRankingEntry[] {
  return models
    .flatMap((model) => {
      const total = model.omniscience_breakdown?.total;
      const idx = total?.omniscience;
      if (idx == null) return [];
      return [
        {
          id: model.id,
          slug: model.slug,
          model: model.name,
          hallucinationRate: normalizePercent(total?.hallucination_rate),
          accuracy: normalizePercent(total?.accuracy),
          attemptRate: normalizePercent(total?.attempt_rate),
          omniscienceIndex: idx,
        },
      ];
    })
    .sort((a, b) => (b.accuracy ?? -Infinity) - (a.accuracy ?? -Infinity));
}

/** Memoized hallucination rankings; empty until `enabled` and data are both present. */
export function useHallucinationRankings(data: ArtificialAnalysisModel[], enabled = true): HallucinationRankingEntry[] {
  return useMemo(() => (enabled && data.length > 0 ? buildHallucinationRankings(data) : []), [data, enabled]);
}

/**
 * Suspense wrapper combining the Artificial Analysis rankings query with the
 * hallucination rankings derived from it — the standard way to consume both.
 */
export function useSuspenseHallucinationRankings(): HallucinationRankingEntry[] {
  const { data } = useSuspenseArtificialRankings();
  return useHallucinationRankings(data);
}

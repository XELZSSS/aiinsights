import { useMemo } from "react";
import type { ArtificialAnalysisModel, HallucinationRankingEntry } from "@/shared/types";
import { normalizePercent } from "@/shared/utils";

export function buildHallucinationRankings(models: ArtificialAnalysisModel[]): HallucinationRankingEntry[] {
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

export function useHallucinationRankings(data: ArtificialAnalysisModel[], enabled = true): HallucinationRankingEntry[] {
  return useMemo(() => (enabled && data.length > 0 ? buildHallucinationRankings(data) : []), [data, enabled]);
}

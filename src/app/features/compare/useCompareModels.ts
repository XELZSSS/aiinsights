import { useMemo } from "react";
import { useCompareStore } from "@/app/stores";
import { modelId } from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";

/**
 * Resolves the compared model ids from the compare store into full model objects
 * from the given Artificial Analysis rankings, preserving the store's order.
 */
export function useCompareModels(rankings: ArtificialAnalysisModel[]): ArtificialAnalysisModel[] {
  const compareIds = useCompareStore((s) => s.compareIds);
  return useMemo(
    () =>
      compareIds.map((id) => rankings.find((m) => modelId(m) === id)).filter((m): m is ArtificialAnalysisModel => !!m),
    [compareIds, rankings],
  );
}

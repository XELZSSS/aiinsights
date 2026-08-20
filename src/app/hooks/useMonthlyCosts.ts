import { useMemo } from "react";
import { calcMonthlyCost } from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { useCostEstimator } from "./useCostEstimator";

/** Cost-estimator state plus the computed monthly cost for every given model. */
export function useMonthlyCosts(models: ArtificialAnalysisModel[]) {
  const estimator = useCostEstimator();
  const { calcInput, calcOutput, calcReasoning, calcCache, calcDays } = estimator;

  const monthlyCosts = useMemo(() => {
    // Estimator inputs are in millions of tokens/day; scale up to raw tokens for the shared helper.
    const opts = {
      dailyInput: calcInput * 1_000_000,
      dailyOutput: calcOutput * 1_000_000,
      dailyReasoning: calcReasoning * 1_000_000,
      cacheHitRate: calcCache,
      daysPerMonth: calcDays,
    };
    return models.map((model) => calcMonthlyCost(model, opts));
  }, [models, calcInput, calcOutput, calcReasoning, calcCache, calcDays]);

  return { ...estimator, monthlyCosts };
}
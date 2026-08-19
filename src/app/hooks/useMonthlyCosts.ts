import { useMemo } from "react";
import { calcMonthlyCost } from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { useCostEstimator } from "./useCostEstimator";

export function useMonthlyCosts(models: ArtificialAnalysisModel[]) {
  const estimator = useCostEstimator();
  const { calcInput, calcOutput, calcReasoning, calcCache, calcDays } = estimator;

  const monthlyCosts = useMemo(() => {
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
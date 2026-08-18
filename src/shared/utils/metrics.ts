import type { TFunction } from "@/shared/i18n";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { clampPercent, normalizePercent } from "./math";
import { formatBoolean, formatScore } from "./format";
import { getOutputSpeed } from "./model";

export interface CompareMetric {
  label: string;
  getValue: (model: ArtificialAnalysisModel) => string;
  getNumericValue?: (model: ArtificialAnalysisModel) => number | null | undefined;
  higherIsBetter?: boolean;
}

function scoreMetric(
  t: TFunction,
  labelKey: Parameters<TFunction>[0],
  getScore: (m: ArtificialAnalysisModel) => number | null | undefined,
): CompareMetric {
  return {
    label: t(labelKey),
    getValue: (model) => formatScore(t, getScore(model)),
    getNumericValue: getScore,
    higherIsBetter: true,
  };
}

function percentMetric(
  t: TFunction,
  labelKey: Parameters<TFunction>[0],
  getScore: (m: ArtificialAnalysisModel) => number | null | undefined,
): CompareMetric {
  return {
    label: t(labelKey),
    getValue: (model) => {
      const n = normalizePercent(getScore(model));
      if (n === null) return t("notAvailable");
      return `${n.toFixed(1)}%`;
    },
    getNumericValue: (model) => normalizePercent(getScore(model)),
    higherIsBetter: true,
  };
}

function formatSpeed(t: TFunction, value?: number | null) {
  if (typeof value !== "number") return t("notAvailable");
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function buildRadarData(t: TFunction, models: ArtificialAnalysisModel[]) {
  return [
    { metric: t("intelligence"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.intelligence_index) },
    { metric: t("coding"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.coding_index) },
    { metric: t("agentic"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.agentic_index) },
    { metric: t("gpqa"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.benchmarks?.gpqa) },
    { metric: t("hle"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.benchmarks?.hle) },
    { metric: t("scicode"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.benchmarks?.scicode) },
    { metric: t("ifbench"), getValue: (model: ArtificialAnalysisModel) => clampPercent(model.benchmarks?.ifbench) },
  ].map((metric) => {
    const row: Record<string, string | number | null> = { metric: metric.metric };
    models.forEach((model, index) => {
      const val = metric.getValue(model);
      row[`model_${index}`] = val != null ? Number(val.toFixed(2)) : null;
    });
    return row;
  });
}

export function buildCompareMetrics(t: TFunction): CompareMetric[] {
  return [
    {
      label: t("creator"),
      getValue: (model) => model.model_creators?.name || t("notAvailable"),
    },
    {
      label: t("releaseDate"),
      getValue: (model) => model.release_date || t("notAvailable"),
    },
    { ...scoreMetric(t, "intelligenceIndex", (m) => m.intelligence_index) },
    { ...scoreMetric(t, "coding", (m) => m.coding_index) },
    { ...scoreMetric(t, "agentic", (m) => m.agentic_index) },
    percentMetric(t, "gpqa", (m) => m.benchmarks?.gpqa),
    percentMetric(t, "hle", (m) => m.benchmarks?.hle),
    percentMetric(t, "scicode", (m) => m.benchmarks?.scicode),
    percentMetric(t, "ifbench", (m) => m.benchmarks?.ifbench),
    {
      label: t("outputSpeed"),
      getValue: (model) => formatSpeed(t, getOutputSpeed(model)),
      getNumericValue: getOutputSpeed,
      higherIsBetter: true,
    },
    {
      label: t("openWeights"),
      getValue: (model) => formatBoolean(t, model.is_open_weights),
    },
  ];
}

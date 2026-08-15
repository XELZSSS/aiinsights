import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PRICING_BLENDS } from "../config";
import type { TFunction } from "../i18n";
import type { ArtificialAnalysisModel } from "../types";
import { formatBoolean, formatContext, formatCost, formatScore } from "./format";

// ---------- cn ----------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------- color ----------

export const COOL_COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#34d399", "#f472b6", "#a78bfa", "#fb923c", "#2dd4bf", "#facc15", "#a3e635"];

export function getModelColor(index: number): string {
  return COOL_COLORS[index % COOL_COLORS.length]!;
}

// ---------- id ----------

export function modelId(m: { id?: string; slug?: string }): string {
  return m.id || m.slug || "";
}

export function findModel<T>(data: T[], id: string, ...keys: (keyof T & string)[]): T | undefined {
  return data.find((item) => keys.some((key) => (item as Record<string, unknown>)[key] === id));
}

// ---------- math ----------

export function normalizePercent(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value === 0) return 0;
  if (value >= -1 && value <= 1) return value * 100;
  return value;
}

export function approxEq(a: number, b: number, eps = 1e-9): boolean {
  if (a === b) return true;
  return Math.abs(a - b) < eps * Math.max(1, Math.abs(a), Math.abs(b));
}

export function clampPercent(value: number | null | undefined): number | null {
  const norm = normalizePercent(value);
  if (norm == null) return null;
  return Math.max(0, Math.min(100, norm));
}

export function calcModelCost(model: ArtificialAnalysisModel, promptTokens: number, completionTokens: number): number | null {
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) return null;
  const pt = Math.max(0, promptTokens);
  const ct = Math.max(0, completionTokens);
  const pricing = model.pricing;
  if (!pricing) return null;
  if (Number.isFinite(pricing.input) && Number.isFinite(pricing.output)) {
    return (pt / 1_000_000) * pricing.input! + (ct / 1_000_000) * pricing.output!;
  }
  const blended = pricing.blended?.[PRICING_BLENDS.INPUT_7_OUTPUT_2_1];
  if (Number.isFinite(blended)) {
    return ((pt + ct) / 1_000_000) * blended!;
  }
  return null;
}

// ---------- providerStats ----------

export function getOutputSpeed(model: ArtificialAnalysisModel): number | null {
  return model.speed?.median_output_speed ?? null;
}

export function groupByProvider(models: ArtificialAnalysisModel[]) {
  const providers = new Map<string, { name: string; color: string; models: ArtificialAnalysisModel[] }>();
  for (const m of models) {
    const name = m.model_creators?.name || "Unknown";
    const color = m.model_creators?.color || "#78716c";
    let bucket = providers.get(name);
    if (!bucket) {
      bucket = { name, color, models: [] };
      providers.set(name, bucket);
    }
    bucket.models.push(m);
  }
  return Array.from(providers.values());
}

function avg(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export interface ProviderStats {
  name: string;
  color: string;
  count: number;
  avgPrice: number | null;
  avgSpeed: number | null;
  avgIntelligence: number | null;
}

export function computeProviderStats(models: ArtificialAnalysisModel[]): ProviderStats[] {
  return groupByProvider(models)
    .map(({ name, color, models: group }) => {
      const count = group.length;
      const avgPrice = avg(group.map((m) => m.pricing?.input).filter((p): p is number => p != null));
      const avgSpeed = avg(group.map(getOutputSpeed).filter((s): s is number => s != null));
      const avgIntelligence = avg(group.map((m) => m.intelligence_index).filter((i): i is number => i != null));
      return { name, color, count, avgPrice, avgSpeed, avgIntelligence };
    })
    .sort((a, b) => b.count - a.count);
}

// ---------- compareMetrics ----------

export interface CompareMetric {
  label: string;
  getValue: (model: ArtificialAnalysisModel) => string;
  getNumericValue?: (model: ArtificialAnalysisModel) => number | null | undefined;
  higherIsBetter?: boolean;
  mobileKey?: boolean;
}

function scoreMetric(t: TFunction, labelKey: Parameters<TFunction>[0], getScore: (m: ArtificialAnalysisModel) => number | null | undefined, mobileKey?: boolean): CompareMetric {
  return {
    label: t(labelKey),
    getValue: (model) => formatScore(t, getScore(model)),
    getNumericValue: getScore,
    higherIsBetter: true,
    mobileKey,
  };
}

function percentMetric(t: TFunction, labelKey: Parameters<TFunction>[0], getScore: (m: ArtificialAnalysisModel) => number | null | undefined): CompareMetric {
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
    {
      label: t("contextWindow"),
      getValue: (model) => formatContext(t, model),
      getNumericValue: (model) => model.context_window_tokens,
      higherIsBetter: true,
      mobileKey: true,
    },
    { ...scoreMetric(t, "intelligenceIndex", (m) => m.intelligence_index, true) },
    { ...scoreMetric(t, "coding", (m) => m.coding_index, true) },
    { ...scoreMetric(t, "agentic", (m) => m.agentic_index, true) },
    percentMetric(t, "gpqa", (m) => m.benchmarks?.gpqa),
    percentMetric(t, "hle", (m) => m.benchmarks?.hle),
    percentMetric(t, "scicode", (m) => m.benchmarks?.scicode),
    percentMetric(t, "ifbench", (m) => m.benchmarks?.ifbench),
    {
      label: t("outputSpeed"),
      getValue: (model) => formatSpeed(t, getOutputSpeed(model)),
      getNumericValue: getOutputSpeed,
      higherIsBetter: true,
      mobileKey: true,
    },
    {
      label: t("costToRun"),
      getValue: (model) => formatCost(t, model.pricing?.intelligence_index_cost?.total_cost),
      getNumericValue: (model) => model.pricing?.intelligence_index_cost?.total_cost,
      higherIsBetter: false,
      mobileKey: true,
    },
    {
      label: t("openWeights"),
      getValue: (model) => formatBoolean(t, model.is_open_weights),
    },
  ];
}

export * from "./format";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BENCHMARK_LABELS as CONFIG_BENCHMARK_LABELS, PRICING_BLENDS } from "@/shared/config";
import type { TFunction, TranslationKey } from "@/shared/i18n";
import type { ArtificialAnalysisModel } from "@/shared/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const COOL_COLORS = [
  "#818cf8",
  "#22d3ee",
  "#fbbf24",
  "#34d399",
  "#f472b6",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#facc15",
  "#a3e635",
];

export function getModelColor(index: number): string {
  return COOL_COLORS[index % COOL_COLORS.length]!;
}

export function modelId(m: { id?: string; slug?: string }): string {
  return m.id || m.slug || "";
}

export function findModel<T>(data: T[], id: string, ...keys: (keyof T & string)[]): T | undefined {
  return data.find((item) => keys.some((key) => (item as Record<string, unknown>)[key] === id));
}

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

function clampPercent(value: number | null | undefined): number | null {
  const norm = normalizePercent(value);
  if (norm == null) return null;
  return Math.max(0, Math.min(100, norm));
}

export function calcModelCost(
  model: ArtificialAnalysisModel,
  promptTokens: number,
  completionTokens: number,
): number | null {
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

function getOutputSpeed(model: ArtificialAnalysisModel): number | null {
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
    {
      label: t("contextWindow"),
      getValue: (model) => formatContext(t, model),
      getNumericValue: (model) => model.context_window_tokens,
      higherIsBetter: true,
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
      label: t("costToRun"),
      getValue: (model) => formatCost(t, model.pricing?.intelligence_index_cost?.total_cost),
      getNumericValue: (model) => model.pricing?.intelligence_index_cost?.total_cost,
      higherIsBetter: false,
    },
    {
      label: t("openWeights"),
      getValue: (model) => formatBoolean(t, model.is_open_weights),
    },
  ];
}

const BENCHMARK_LABELS: Record<string, TranslationKey> = {
  ...CONFIG_BENCHMARK_LABELS,
  hle: "benchmarkHle",
  gdpval: "benchmarkGdpval",
  scicode: "benchmarkScicode",
  ifbench: "benchmarkIfbench",
  lcr: "benchmarkLcr",
  tau2: "benchmarkTau2",
  tau_banking: "benchmarkTauBanking",
  terminalbench_v2_1: "benchmarkTerminalbenchV2_1",
  terminalbench_hard: "benchmarkTerminalbenchHard",
  critpt: "benchmarkCritpt",
  apex_agents: "benchmarkApexAgents",
  omniscience: "benchmarkOmniscience",
};

export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    return undefined;
  }
  return undefined;
}

export function formatBoolean(t: TFunction, value?: boolean | null) {
  if (value === true) return t("yes");
  if (value === false) return t("no");
  return t("notAvailable");
}

export function formatShortNumber(n: number) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs}`;
}

export function formatScore(t: TFunction, n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return t("notAvailable");
  return n.toFixed(2);
}

export function formatCost(t: TFunction, n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return t("notAvailable");
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatContext(t: TFunction, model: ArtificialAnalysisModel) {
  if (model.contextWindowFormatted) return model.contextWindowFormatted;
  if (!model.context_window_tokens) return t("notAvailable");
  if (model.context_window_tokens >= 1000000) return `${Math.round(model.context_window_tokens / 1000000)}m`;
  if (model.context_window_tokens >= 1000) return `${Math.round(model.context_window_tokens / 1000)}k`;
  return model.context_window_tokens.toLocaleString();
}

export function formatDollar(v: number | null | undefined, t?: TFunction): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return t?.("notAvailable") ?? "N/A";
  return `$${v.toFixed(2)}`;
}

export function formatPricePerMillion(v: number | null | undefined, t?: TFunction): string {
  if (typeof v === "number") return `$${v.toFixed(2)}${t ? t("perMTokens") : "/M tokens"}`;
  return t ? t("notAvailable") : "N/A";
}

export function formatTrend(change?: number | null, t?: TFunction): string {
  if (change == null) return t ? t("notAvailable") : "N/A";
  if (change === 0) return "0.0%";
  return `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;
}

const CAT_MAP: Record<string, TranslationKey> = { coding: "catCoding", reasoning: "catReasoning" };

export function categoryLabel(cat: string, t: TFunction): string {
  return t(CAT_MAP[cat] ?? "catGeneral");
}

export function formatRelativeTime(isoString: string, t: TFunction): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return t("timeJustNow");
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return t("timeJustNow");
  if (diffMins < 60) return t("timeMinutesAgo", { value: diffMins });
  if (diffHours < 24) return t("timeHoursAgo", { value: diffHours });
  return t("timeDaysAgo", { value: diffDays });
}

function localeOf(lang: string): string {
  return lang === "zh" ? "zh-CN" : "en-US";
}

export function formatDate(isoString: string | number | Date, lang: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString);
  return date.toLocaleDateString(localeOf(lang));
}

export function orNA(value: string | null | undefined, t: TFunction): string {
  return value || t("notAvailable");
}

export function benchmarkLabel(key: string, t: TFunction): string {
  const labelKey = BENCHMARK_LABELS[key];
  return labelKey ? t(labelKey) : key;
}

const RECOMMENDATION_KEYS = {
  claude: "recClaude",
  deepseek: "recDeepseek",
  gpt: "recGpt",
  gemini: "recGemini",
  mimo: "recMimo",
} as const satisfies Record<string, TranslationKey>;

export function getModelRecommendation(id: string, t: TFunction): string {
  const lower = id.toLowerCase();
  let key: TranslationKey = "recDefault";
  if (/claude-3[.-]5-sonnet/.test(lower)) key = RECOMMENDATION_KEYS.claude;
  else if (/deepseek-[vr]/.test(lower)) key = RECOMMENDATION_KEYS.deepseek;
  else if (/gpt-[45]/.test(lower)) key = RECOMMENDATION_KEYS.gpt;
  else if (/gemini/.test(lower)) key = RECOMMENDATION_KEYS.gemini;
  else if (/mimo/.test(lower)) key = RECOMMENDATION_KEYS.mimo;
  return t(key);
}

export const chartTooltipStyle = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: "12px",
  borderRadius: "6px",
} as const;

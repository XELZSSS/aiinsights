import { BENCHMARK_LABELS as CONFIG_BENCHMARK_LABELS } from "@/shared/config";
import type { TFunction, TranslationKey } from "@/shared/i18n";

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

export function formatTokens(n: number | null | undefined, t?: TFunction): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return t ? t("notAvailable") : "N/A";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export function formatScore(t: TFunction, n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return t("notAvailable");
  return n.toFixed(2);
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

import type { TranslationKey } from "@/shared/i18n";
import type { ArenaCategory, NewsCategory } from "@/shared/types";

export const FIVE_MINUTES = 5 * 60_000;
export const THIRTY_MINUTES = 30 * 60_000;

export const upstreamConfig = {
  arena: "https://arena.ai/leaderboard",
  artificialAnalysis: "https://artificialanalysis.ai",
  huggingface: "https://huggingface.co/api/models",
  openrouter: "https://openrouter.ai",
} as const;

export const USER_AGENT = "AIInsights/2.0";

export const DEFAULT_TTL_MS = FIVE_MINUTES;
export const NEWS_TTL_MS = THIRTY_MINUTES;
export const PARTIAL_FAIL_TTL_MS = 60_000;

export const ARENA_CATEGORIES: readonly ArenaCategory[] = ["text", "text-to-image"] as const;

const VENTUREBEAT_AI = "https://venturebeat.com/category/ai/feed/";
const ARS_TECHNICA = "https://feeds.arstechnica.com/arstechnica/index";
const WIRED = "https://www.wired.com/feed/tag/ai/latest/rss";
const TECHCRUNCH_AI = "https://techcrunch.com/category/artificial-intelligence/feed/";
const ZDNET = "https://www.zdnet.com/topic/artificial-intelligence/rss.xml";
const TECHCRUNCH_STARTUPS = "https://techcrunch.com/category/startups/feed/";
const CRUNCHBASE = "https://news.crunchbase.com/feed/";
const HF_BLOG = "https://huggingface.co/blog/feed.xml";
const ANALYTICS_VIDHYA = "https://www.analyticsvidhya.com/blog/category/artificial-intelligence/feed/";
const MIT_TECH_REVIEW = "https://www.technologyreview.com/topic/artificial-intelligence/feed/";

export const rssConfig: Record<NewsCategory, readonly string[]> = {
  industry: [VENTUREBEAT_AI, TECHCRUNCH_AI, ARS_TECHNICA, WIRED, MIT_TECH_REVIEW],
  opensource: [ANALYTICS_VIDHYA, HF_BLOG],
  hardware: [ZDNET],
  funding: [TECHCRUNCH_STARTUPS, CRUNCHBASE],
};

export const BENCHMARK_KEYS = [
  "aime25",
  "gpqa",
  "hle",
  "mmlu_pro",
  "livecodebench",
  "gdpval",
  "scicode",
  "ifbench",
  "lcr",
  "tau2",
  "tau_banking",
  "terminalbench_v2_1",
  "terminalbench_hard",
  "critpt",
  "apex_agents",
  "omniscience",
] as const;

export type BenchmarkKey = (typeof BENCHMARK_KEYS)[number];

export const STORAGE_KEYS = {
  lang: "lang",
  theme: "theme",
  compare: "compare-store",
} as const;

const DEFAULT_BACK = "backToModelRankings" as const;

export const MODEL_SOURCES = {
  aa: {
    labelKey: "modelRankings" as const,
    sourceLabelKey: "artificialSource" as const,
    backTo: "/models",
    backLabelKey: DEFAULT_BACK,
  },
  or: {
    labelKey: "openRouterRankings" as const,
    sourceLabelKey: "openRouterSource" as const,
    backTo: "/models",
    backLabelKey: DEFAULT_BACK,
  },
  os: {
    labelKey: "openSourceRankings" as const,
    sourceLabelKey: "openSourceDataSource" as const,
    backTo: "/models",
    backLabelKey: DEFAULT_BACK,
  },
  hall: {
    labelKey: "hallucinationRankings" as const,
    sourceLabelKey: "hallucinationSource" as const,
    backTo: "/models",
    backLabelKey: DEFAULT_BACK,
  },
} as const;

export type ModelSource = keyof typeof MODEL_SOURCES;

export const RANKING_BENCHMARK_KEYS = ["aime25", "gpqa", "mmlu_pro", "livecodebench"] as const;

export const BENCHMARK_LABELS: Record<(typeof RANKING_BENCHMARK_KEYS)[number], TranslationKey> = {
  aime25: "benchmarkAime25",
  gpqa: "benchmarkGpqa",
  mmlu_pro: "benchmarkMmluPro",
  livecodebench: "benchmarkLivecodebench",
};

export const apiBase = import.meta.env?.VITE_API_BASE?.replace(/\/+$/, "") ?? "";

export const REPO_URL = "https://github.com/XELZSSS/aiinsights";

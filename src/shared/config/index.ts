import type { TranslationKey } from "@/shared/i18n";

export const FIVE_MINUTES = 5 * 60_000;
export const THIRTY_MINUTES = 30 * 60_000;
export const HEALTH_CHECK_INTERVAL = 60 * 1000;
export const SYSTEM_STATS_INTERVAL = 30 * 1_000;

export const upstreamConfig = {
  arena: "https://arena.ai/leaderboard",
  artificialAnalysis: "https://artificialanalysis.ai",
  huggingface: "https://huggingface.co/api/models",
  openrouter: "https://openrouter.ai",
  polymarket: "https://gamma-api.polymarket.com",
} as const;

export const HEALTH_TIMEOUT_MS = 5_000;
export const USER_AGENT = "AIInsights/2.0";

export const PRICING_BLENDS = {
  INPUT_3_OUTPUT_1: "0_3_1",
  INPUT_7_OUTPUT_2_1: "7_2_1",
  INPUT_0_OUTPUT_1_1: "0_1_1",
  INPUT_0_OUTPUT_100_1: "0_100_1",
  INPUT_100_OUTPUT_1_1: "100_1_1",
} as const;

export const DEFAULT_TTL_MS = FIVE_MINUTES;
export const NEWS_TTL_MS = THIRTY_MINUTES;
export const HEALTH_TTL_MS = 60 * 1_000;
export const POLYMARKET_TAGS_TTL_MS = 24 * 60 * 60 * 1_000;
export const START_MARKER_TTL_MS = 365 * 24 * 60 * 60 * 1_000;
export const PARTIAL_FAIL_TTL_MS = 60_000;

export const ARENA_CATEGORIES = ["text", "text-to-image", "image-editing", "video", "audio"] as const;

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

export const rssConfig = {
  industry: [VENTUREBEAT_AI, TECHCRUNCH_AI, ARS_TECHNICA, WIRED, MIT_TECH_REVIEW],
  opensource: [ANALYTICS_VIDHYA, HF_BLOG],
  hardware: [ZDNET],
  funding: [TECHCRUNCH_STARTUPS, CRUNCHBASE],
} as const;

export const BENCHMARK_KEYS = [
  "aime25",
  "gpqa",
  "hle",
  "mmlu_pro",
  "math_500",
  "humaneval",
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

export interface HealthProbe {
  name: string;
  url: string;
  apiPath: string;
}

export const HEALTH_PROBES: readonly HealthProbe[] = [
  { name: "HuggingFace Models", url: `${upstreamConfig.huggingface}?limit=1`, apiPath: "/api/open-source-models" },
  {
    name: "HuggingFace Releases",
    url: `${upstreamConfig.huggingface}?sort=createdAt&direction=-1&limit=1`,
    apiPath: "/api/open-source-releases",
  },
  { name: "Artificial Analysis", url: upstreamConfig.artificialAnalysis, apiPath: "/api/artificial-analysis-index" },
  {
    name: "OpenRouter Rankings",
    url: `${upstreamConfig.openrouter}/api/v1/models`,
    apiPath: "/api/openrouter-rankings",
  },
  { name: "Arena.ai Leaderboard", url: `${upstreamConfig.arena}/`, apiPath: "/api/arena-leaderboard" },
  { name: "Polymarket Predictions", url: `${upstreamConfig.polymarket}/markets?limit=1`, apiPath: "/api/predictions" },
];

export const STORAGE_KEYS = {
  lang: "lang",
  theme: "theme",
  compare: "compare-store",
} as const;

const DEFAULT_BACK = "backToModelRankings" as const;

export const MODEL_SOURCES = {
  aa: { labelKey: "modelRankings" as const, backTo: "/models", backLabelKey: DEFAULT_BACK },
  or: { labelKey: "openRouterRankings" as const, backTo: "/models", backLabelKey: DEFAULT_BACK },
  os: {
    labelKey: "openSourceRankings" as const,
    backTo: "/open-source",
    backLabelKey: "backToOpenSourceRankings" as const,
  },
  hall: { labelKey: "hallucinationRankings" as const, backTo: "/hallucinations", backLabelKey: DEFAULT_BACK },
  tts: { labelKey: "tts" as const, backTo: "/tts", backLabelKey: DEFAULT_BACK },
} as const;

export type ModelSource = keyof typeof MODEL_SOURCES;

export const RANKING_BENCHMARK_KEYS = ["aime25", "gpqa", "mmlu_pro", "math_500", "humaneval", "livecodebench"] as const;

export const BENCHMARK_LABELS: Record<(typeof RANKING_BENCHMARK_KEYS)[number], TranslationKey> = {
  aime25: "benchmarkAime25",
  gpqa: "benchmarkGpqa",
  mmlu_pro: "benchmarkMmluPro",
  math_500: "benchmarkMath500",
  humaneval: "benchmarkHumaneval",
  livecodebench: "benchmarkLivecodebench",
};

export const apiBase = import.meta.env?.VITE_API_BASE?.replace(/\/+$/, "") ?? "";

export const REPO_URL = "https://github.com/XELZSSS/aiinsights";
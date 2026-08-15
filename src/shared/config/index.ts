import type { Lang, TranslationKey } from "../i18n";

export const FIVE_MINUTES = 5 * 60_000;
export const THIRTY_MINUTES = 30 * 60_000;
export const HEALTH_CHECK_INTERVAL = 60 * 1000;
export const SYSTEM_STATS_INTERVAL = 30 * 1_000;

export const STORAGE_KEYS = {
  lang: "lang",
  theme: "theme",
  compare: "compare-store",
  cacheVersion: "app_cache_ver",
} as const;

const DEFAULT_BACK = "backToModelRankings" as const;

export const MODEL_SOURCES = {
  aa: { labelKey: "modelRankings" as const, backTo: "/models", backLabelKey: DEFAULT_BACK },
  or: { labelKey: "openRouterRankings" as const, backTo: "/models", backLabelKey: DEFAULT_BACK },
  os: { labelKey: "openSourceRankings" as const, backTo: "/open-source", backLabelKey: "backToOpenSourceRankings" as const },
  hall: { labelKey: "hallucinationRankings" as const, backTo: "/hallucinations", backLabelKey: DEFAULT_BACK },
  tts: { labelKey: "tts" as const, backTo: "/tts", backLabelKey: DEFAULT_BACK },
} as const;

export type ModelSource = keyof typeof MODEL_SOURCES;

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

export const apiBase = import.meta.env?.VITE_API_BASE?.replace(/\/+$/, "") ?? "";

export const REPO_URL = "https://github.com/XELZSSS/aiinsights";

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

export const RANKING_BENCHMARK_KEYS = ["aime25", "gpqa", "mmlu_pro", "math_500", "humaneval", "livecodebench"] as const;

export const BENCHMARK_LABELS: Record<(typeof RANKING_BENCHMARK_KEYS)[number], TranslationKey> = {
  aime25: "benchmarkAime25",
  gpqa: "benchmarkGpqa",
  mmlu_pro: "benchmarkMmluPro",
  math_500: "benchmarkMath500",
  humaneval: "benchmarkHumaneval",
  livecodebench: "benchmarkLivecodebench",
};

const RECOMMENDATIONS: { [key: string]: { en: string; zh: string } } = {
  claude: {
    en: "The industry standard for code generation and multi-step planning, with outstanding intelligence and instruction-following.",
    zh: "当前行业公认的代码生成与多步骤规划标杆，智能与指令遵循等级极其优秀。",
  },
  deepseek: {
    en: "Possesses top-tier reasoning and deep chain-of-thought capabilities, making it the most cost-effective choice for developers.",
    zh: "拥有顶尖的推理及深度思维链链条能力，是当前极客开发极高性价比的顶流。",
  },
  gpt: {
    en: "A masterpiece in multimodal capability and low latency, standing as the stable first choice for complex production environments.",
    zh: "多模态与超低调用延迟的代表作，生产环境复杂业务落地的稳定首选之作。",
  },
  gemini: {
    en: "A powerful tool for multimodal, complex, long-context analysis and huge document processing (up to millions of tokens).",
    zh: "超大上下文（达百万级别）的多模态复杂长文本分析与大文档处理神器。",
  },
  mimo: {
    en: "A representative of highly energy-efficient reasoning, perfect for high-concurrency, low-latency, multi-agent communication.",
    zh: "高能效推理模型代表，极适合高并发、低延迟的轻量多 Agent 通信场景。",
  },
  default: {
    en: "Suitable for daily general conversations, lightweight agent tasks, and general text processing scenarios.",
    zh: "适用于日常通用多轮对话、轻量级 Agent 任务与通用文本处理场景。",
  },
};

export function getRecommendation(id: string, lang: Lang): string {
  const lower = id.toLowerCase();
  if (/claude-3[.-]5-sonnet/.test(lower)) return RECOMMENDATIONS.claude![lang];
  if (/deepseek-[vr]/.test(lower)) return RECOMMENDATIONS.deepseek![lang];
  if (/gpt-[45]/.test(lower)) return RECOMMENDATIONS.gpt![lang];
  if (/gemini/.test(lower)) return RECOMMENDATIONS.gemini![lang];
  if (/mimo/.test(lower)) return RECOMMENDATIONS.mimo![lang];
  return RECOMMENDATIONS.default![lang];
}

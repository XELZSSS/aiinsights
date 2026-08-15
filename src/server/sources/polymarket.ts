import { upstreamConfig, DEFAULT_TTL_MS, POLYMARKET_TAGS_TTL_MS } from "../../shared/config";
import { errorMessage } from "../core";
import type { ModelPrediction, ReleasePrediction, ProviderPrediction, PredictionsPayload } from "../../shared/types";
import { createSource, deduplicateBy, formatSettleErrors, settledValues } from "./misc";
import type { AppContext } from "../context";

const API = upstreamConfig.polymarket;
const TOP_N = 6;

const TAGS_PAGE_LIMIT = 100;
const TAGS_MAX_PAGES = 5;
const TAGS_CONCURRENCY = 3;
const MAX_AI_TAGS = 15;

const AI_TAG_PATTERN =
  /(^|[^a-z0-9])(ai|gpt|llm)([^a-z0-9]|$)|openai|chatgpt|claude|gemini|grok|deepseek|anthropic|qwen|mistral|llama|alibaba|nvidia|xiaomi|artificial|machine|agent|big-tech|tech-release|\btech\b|\bipo\b|\bxai\b|\bgoogle\b|\bamazon\b|\bmeta\b/i;

const FALLBACK_TAGS: { id: string; slug: string }[] = [
  { id: "537", slug: "openai" },
  { id: "103303", slug: "claude" },
  { id: "439", slug: "ai" },
  { id: "662", slug: "llm" },
];

interface Tag {
  id: string;
  slug: string;
}

async function discoverAiTags(ctx: AppContext): Promise<Tag[]> {
  return ctx.cache.withTtl("polymarket:ai-tags", POLYMARKET_TAGS_TTL_MS, async () => {
    const found: Tag[] = [];
    let pageNumber = 0;
    let failed = false;

    while (pageNumber < TAGS_MAX_PAGES && found.length < MAX_AI_TAGS) {
      const batchOffsets = Array.from({ length: TAGS_CONCURRENCY }, (_, i) => (pageNumber + i) * TAGS_PAGE_LIMIT);
      const pageResults = await Promise.allSettled(batchOffsets.map((offset) => ctx.http.json<Tag[]>(`${API}/tags?limit=${TAGS_PAGE_LIMIT}&offset=${offset}`)));
      let batchProgress = false;
      for (const r of pageResults) {
        if (r.status !== "fulfilled" || !Array.isArray(r.value) || r.value.length === 0) {
          failed = true;
          continue;
        }
        batchProgress = true;
        for (const t of r.value) {
          if (typeof t.id === "string" && typeof t.slug === "string" && AI_TAG_PATTERN.test(t.slug.toLowerCase())) {
            found.push({ id: t.id, slug: t.slug });
          }
        }
      }
      if (!batchProgress) break;
      pageNumber += TAGS_CONCURRENCY;
    }

    const unique = deduplicateBy(found, (t) => t.id);
    if (unique.length === 0) {
      ctx.log("warn", `[polymarket] tag discovery returned nothing, using fallback tags`);
      return { data: FALLBACK_TAGS, ttl: 60_000 };
    }
    if (failed) {
      ctx.log("warn", `[polymarket] tag discovery incomplete (${unique.length} tags found), using partial set`);
      return { data: unique, ttl: 60_000 };
    }
    return { data: unique, ttl: POLYMARKET_TAGS_TTL_MS };
  });
}

interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  volume24hr: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  events?: { slug?: string }[];
}

const COMPANY_KEYWORDS: Record<string, string[]> = {
  OpenAI: ["openai", "gpt", "chatgpt", "o1", "o3", "o4"],
  Anthropic: ["anthropic", "claude"],
  Google: ["google", "gemini", "deepmind"],
  Meta: ["meta", "llama"],
  Microsoft: ["microsoft", "copilot"],
  xAI: ["xai", "grok"],
  Mistral: ["mistral"],
  DeepSeek: ["deepseek"],
  Alibaba: ["alibaba", "qwen", "z.ai"],
  NVIDIA: ["nvidia"],
  Apple: ["apple"],
  Amazon: ["amazon"],
  Perplexity: ["perplexity"],
};

function parseArr(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parsePrices(raw: string): number[] {
  return parseArr(raw).map((s) => Number(s) || 0);
}

function parseOutcomes(m: Market) {
  return { outcomes: parseArr(m.outcomes), prices: parsePrices(m.outcomePrices) };
}

function detectCompany(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [company, kw] of Object.entries(COMPANY_KEYWORDS)) {
    if (kw.some((k) => lower.includes(k))) return company;
  }
  return null;
}

function classify(q: string): "model_ranking" | "release" | "provider" | "other" {
  const lower = q.toLowerCase();
  if (/release|launch|ship|come out/.test(lower)) return "release";
  if (/best.*model|top.*model|number.*1.*model/.test(lower)) return "model_ranking";
  if (/ipo|valuation|market cap/.test(lower)) return "provider";
  const company = detectCompany(q);
  if (company && /model|arena|benchmark|elo|intelligen|lab|frontier|score|agent/.test(lower)) return "model_ranking";
  return "other";
}

function yesProb(outcomes: string[], prices: number[]): number {
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i]?.toLowerCase() === "yes") return prices[i] || 0;
  }
  return prices.length > 0 ? Math.max(...prices) : 0;
}

function deadline(endDate: string): string {
  if (!endDate) return "";
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function marketUrl(m: Market): string {
  const eventSlug = m.events?.[0]?.slug || m.slug;
  return eventSlug ? `https://polymarket.com/event/${eventSlug}` : "";
}

function volume24h(m: Market): number {
  return Number(m.volume24hr) || Number(m.volume) || 0;
}

function sortByActivity<T extends { volume: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.volume - a.volume).slice(0, TOP_N);
}

function settleOrThrow<T>(results: PromiseSettledResult<T[]>[], label: string): T[] {
  const valid = settledValues(results)
    .filter((v): v is T[] => Array.isArray(v))
    .flatMap((v) => v);
  if (valid.length === 0) {
    const reasons = formatSettleErrors(
      results,
      results.map((_, i) => `${label} #${i + 1}`),
    );
    throw new Error(`${label}: all upstream requests failed${reasons ? ` (${reasons})` : ""}`);
  }
  return valid;
}

async function fetchLiveMarkets(ctx: AppContext): Promise<Market[]> {
  const tags = await discoverAiTags(ctx);
  const results = await Promise.allSettled(
    tags.map((tag) => ctx.http.json<Market[]>(`${API}/markets?tag_id=${tag.id}&active=true&closed=false&limit=50&order=volume24hr&ascending=false`)),
  );
  const markets = settleOrThrow(results, "Polymarket");

  const now = Date.now();
  return deduplicateBy(
    markets.filter((m) => {
      const end = m.endDate ? Date.parse(m.endDate) : NaN;
      return m.active && !m.closed && !m.archived && (!Number.isNaN(end) ? end > now : true) && volume24h(m) > 0;
    }),
    (m) => m.id,
  );
}

function buildModelPredictions(markets: Market[]): ModelPrediction[] {
  return sortByActivity(
    markets
      .filter((m) => classify(m.question) === "model_ranking")
      .map((m) => {
        const company = detectCompany(m.question);
        if (!company) return null;
        const { outcomes, prices } = parseOutcomes(m);
        return {
          id: m.id,
          question: m.question,
          company,
          probability: yesProb(outcomes, prices),
          volume: volume24h(m),
          deadline: deadline(m.endDate),
          url: marketUrl(m),
        };
      })
      .filter((x): x is ModelPrediction => x !== null),
  );
}

function buildReleasePredictions(markets: Market[]): ReleasePrediction[] {
  return sortByActivity(
    markets
      .filter((m) => classify(m.question) === "release")
      .map((m) => {
        const { outcomes, prices } = parseOutcomes(m);
        const modelMatch = m.question.match(/(?:GPT|Claude|Gemini|Llama|Grok)[\s-]?\d[\w.]*/i);
        return {
          id: m.id,
          question: m.question,
          model: modelMatch?.[0] || m.question.split("?")[0]?.trim() || m.question,
          predictions: outcomes.map((label, i) => ({ window: label, probability: prices[i] || 0 })),
          volume: volume24h(m),
          url: marketUrl(m),
        };
      }),
  );
}

function buildProviderPredictions(markets: Market[]): ProviderPrediction[] {
  return sortByActivity(
    markets
      .filter((m) => classify(m.question) === "provider")
      .map((m) => {
        const provider = detectCompany(m.question);
        if (!provider) return null;
        const { outcomes, prices } = parseOutcomes(m);
        return {
          id: m.id,
          question: m.question,
          provider,
          options: outcomes.map((label, i) => ({ label, probability: prices[i] || 0 })),
          volume: volume24h(m),
          deadline: deadline(m.endDate),
          url: marketUrl(m),
        };
      })
      .filter((x): x is ProviderPrediction => x !== null),
  );
}

export const getPredictions = createSource<Record<string, never>, PredictionsPayload>({
  cacheKey: () => "polymarket:predictions",
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    try {
      const markets = await fetchLiveMarkets(ctx);
      return {
        data: {
          modelRankings: buildModelPredictions(markets),
          releases: buildReleasePredictions(markets),
          providers: buildProviderPredictions(markets),
        },
        ttl: DEFAULT_TTL_MS,
      };
    } catch (e) {
      ctx.log("error", `[polymarket] predictions failed: ${errorMessage(e)}`);
      return { data: { modelRankings: [], releases: [], providers: [] }, ttl: 60_000 };
    }
  },
});

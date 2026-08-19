import { upstreamConfig, DEFAULT_TTL_MS, PARTIAL_FAIL_TTL_MS } from "@/shared/config";
import type { OpenRouterRankingsPayload, OpenRouterRankEntry } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { numOr } from "@/server/parsers/primitives";
import { createSource } from "@/server/core/source";
import { formatSettleErrors } from "@/server/core/utils";

const OPENROUTER = upstreamConfig.openrouter;

const CREATORS: Record<string, string> = {
  anthropic: "Anthropic",
  cohere: "Cohere",
  deepseek: "DeepSeek",
  google: "Google",
  mistralai: "Mistral",
  "meta-llama": "Meta",
  minimax: "MiniMax",
  openai: "OpenAI",
  qwen: "Qwen",
  xiaomi: "Xiaomi",
};

interface ModelRow {
  date: string;
  model_permaslug: string;
  variant: string;
  variant_permaslug: string;
  total_completion_tokens: number;
  total_prompt_tokens: number;
  total_native_tokens_reasoning: number;
  count: number;
  image_output_requests: number;
  video_output_seconds: number;
  change: number | null;
}

function creatorFromSlug(slug: string): string {
  const p = slug.split("/")[0] || "Unknown";
  return CREATORS[p.toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1);
}

function categoryFrom(slug: string, name: string): OpenRouterRankEntry["category"] {
  const v = `${slug} ${name}`.toLowerCase();
  if (/coder|coding|code/.test(v)) return "coding";
  if (/reasoning|thought|r1|-o1/.test(v)) return "reasoning";
  return "general";
}

function titleFromSlug(permaslug: string): string {
  return (permaslug.split("/").slice(1).join("/") || permaslug)
    .replace(/[:/]/g, " ")
    .split("-")
    .filter(Boolean)
    .map((p) => (p.length <= 3 || /^\d/.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

const SUM_KEYS = [
  "total_prompt_tokens",
  "total_completion_tokens",
  "total_native_tokens_reasoning",
  "count",
  "image_output_requests",
  "video_output_seconds",
] as const;

function mergeRows(rows: ModelRow[]): ModelRow[] {
  const grouped = new Map<string, ModelRow>();
  let idx = 0;
  for (const row of rows) {
    const key = row.variant_permaslug || row.model_permaslug || `unknown-${idx++}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...row, variant_permaslug: key });
      continue;
    }
    for (const k of SUM_KEYS) {
      existing[k] = numOr(existing[k]) + numOr(row[k]);
    }
    if (row.date && (!existing.date || row.date > existing.date)) existing.date = row.date;
    if (row.change != null) existing.change = row.change;
  }
  return Array.from(grouped.values());
}

interface PricingEntry {
  prompt: number;
  completion: number;
}

function mapModels(rows: ModelRow[], pricingMap: Map<string, PricingEntry>): OpenRouterRankEntry[] {
  return mergeRows(rows)
    .sort(
      (a, b) =>
        numOr(b.total_prompt_tokens) +
        numOr(b.total_completion_tokens) -
        (numOr(a.total_prompt_tokens) + numOr(a.total_completion_tokens)),
    )
    .map((row, i) => {
      const id = row.model_permaslug;
      const name = titleFromSlug(id);
      const pricing = pricingMap.get(row.variant_permaslug || id) ?? pricingMap.get(id);
      const isFree = pricing ? pricing.prompt === 0 && pricing.completion === 0 : undefined;
      return {
        rank: i + 1,
        id,
        name,
        creator: creatorFromSlug(id),
        category: categoryFrom(id, name),
        variant: row.variant,
        totalTokens: numOr(row.total_prompt_tokens) + numOr(row.total_completion_tokens),
        promptTokens: numOr(row.total_prompt_tokens),
        completionTokens: numOr(row.total_completion_tokens),
        reasoningTokens: numOr(row.total_native_tokens_reasoning),
        requestCount: numOr(row.count),
        imageOutputRequests: numOr(row.image_output_requests),
        videoOutputSeconds: numOr(row.video_output_seconds),
        change: row.change ?? null,
        pricing,
        isFree,
      };
    });
}

interface PricingRow {
  id: string;
  pricing?: { prompt?: string | number; completion?: string | number };
}

type PricingRecord = Record<string, PricingEntry>;

const PRICING_TTL_MS = 30 * 60_000;

async function fetchModelPricing(ctx: AppContext): Promise<Map<string, PricingEntry>> {
  try {
    const record = await ctx.cache.withTtl("openrouter:pricing-map", PRICING_TTL_MS, async () => {
      const res = await ctx.http.json<{ data: PricingRow[] }>(`${OPENROUTER}/api/v1/models`);
      const record: PricingRecord = {};
      for (const m of res?.data ?? []) {
        if (!m?.id || !m.pricing) continue;
        const prompt = Number(m.pricing.prompt);
        const completion = Number(m.pricing.completion);
        if (Number.isFinite(prompt) && Number.isFinite(completion)) {
          record[m.id] = { prompt, completion };
        }
      }
      return { data: record };
    });
    return new Map(Object.entries(record));
  } catch {
    return new Map<string, PricingEntry>();
  }
}

export const getOpenRouterRankings = createSource<Record<string, never>, OpenRouterRankingsPayload>({
  cacheKey: () => "openrouter-rankings",
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const [modelResult, pricingResult] = await Promise.allSettled([
      ctx.http.json<{ data: ModelRow[] }>(`${OPENROUTER}/api/frontend/v1/rankings/models`),
      fetchModelPricing(ctx),
    ]);
    const modelRows = modelResult.status === "fulfilled" ? (modelResult.value?.data ?? []) : [];
    const pricingMap = pricingResult.status === "fulfilled" ? pricingResult.value : new Map<string, PricingEntry>();
    if (modelRows.length === 0) {
      const reasons = formatSettleErrors([modelResult], ["models"]);
      throw new Error(`OpenRouter: all upstream requests failed${reasons ? ` (${reasons})` : ""}`);
    }
    const partialFailure = modelResult.status !== "fulfilled" || pricingResult.status !== "fulfilled";
    return {
      data: {
        tokenUsageRankings: mapModels(modelRows, pricingMap),
        fetchedAt: new Date().toISOString(),
      },
      ttl: partialFailure ? PARTIAL_FAIL_TTL_MS : DEFAULT_TTL_MS,
    };
  },
});

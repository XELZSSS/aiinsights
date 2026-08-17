import { upstreamConfig, DEFAULT_TTL_MS, BLENDED_PRICE_KEY, BENCHMARK_KEYS } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { num, str, strOr, bool, obj, findNextData, parseRscPayload } from "@/server/parser";
import { createSource } from "@/server/core";

const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%5D" } as const;

async function fetchAaRsc(ctx: AppContext, path: string): Promise<string> {
  return ctx.http.text(`${upstreamConfig.artificialAnalysis}${path}`, {
    headers: { ...RSC_HEADERS },
    retries: 0,
    timeoutMs: 30_000,
  });
}

function compactBenchmarks(m: Record<string, unknown>): Record<string, number | null> {
  const nested = obj(m.benchmarks);
  const benchmarks: Record<string, number | null> = {};
  for (const key of BENCHMARK_KEYS) {
    benchmarks[key] = num(m[key]) ?? (nested ? num(nested[key]) : null);
  }
  return benchmarks;
}

function compactPricing(
  m: Record<string, unknown>,
  iic: Record<string, unknown> | undefined,
): ArtificialAnalysisModel["pricing"] {
  return {
    input: num(m.price_1m_input_tokens),
    output: num(m.price_1m_output_tokens),
    cache_hit: num(m.cache_hit_price),
    blended: { [BLENDED_PRICE_KEY]: num(m.price_1m_blended_7_2_1) ?? undefined },
    intelligence_index_cost: iic && typeof iic.total_cost === "number" ? { total_cost: iic.total_cost } : undefined,
  };
}

function compactSpeed(
  m: Record<string, unknown>,
  td: Record<string, unknown> | undefined,
): ArtificialAnalysisModel["speed"] {
  const median_output_speed = num(td?.median_output_speed) ?? num(m.median_output_speed);
  return { median_output_speed };
}

function compactCodingIndex(m: Record<string, unknown>): number | null {
  const tb = num(m.terminalbench_v2_1);
  const sc = num(m.scicode);
  if (tb == null && sc == null) return null;
  const values = [tb, sc].filter((v): v is number => v != null);
  return (values.reduce((a, b) => a + b, 0) / values.length) * 100;
}

function compactOmniscience(m: Record<string, unknown>): ArtificialAnalysisModel["omniscience_breakdown"] {
  const omn = obj(m.omniscience_breakdown);
  const total = omn ? obj(omn.total) : undefined;
  if (!total) return undefined;
  return {
    total: {
      accuracy: num(total.accuracy),
      attempt_rate: num(total.attempt_rate),
      hallucination_rate: num(total.hallucination_rate),
      omniscience: num(total.omniscience),
    },
  };
}

function compact(m: Record<string, unknown>): ArtificialAnalysisModel {
  const mc = obj(m.model_creators);
  const iic = obj(m.intelligence_index_cost);
  const td = obj(m.timescaleData);

  return {
    id: str(m.id),
    slug: str(m.slug),
    name: str(m.name),
    short_name: strOr(m.short_name),
    model_creators: mc ? { name: str(mc.name), color: str(mc.color) } : undefined,
    intelligence_index: num(m.intelligence_index),
    intelligence_index_is_estimated: bool(m.intelligence_index_is_estimated),
    coding_index: compactCodingIndex(m),
    agentic_index: num(m.agentic_index),
    context_window_tokens: num(m.context_window_tokens),
    contextWindowFormatted: strOr(m.contextWindowFormatted),
    release_date: strOr(m.release_date),
    is_open_weights: bool(m.is_open_weights),
    benchmarks: compactBenchmarks(m),
    pricing: compactPricing(m, iic),
    speed: compactSpeed(m, td),
    input_modality_text: bool(m.input_modality_text),
    input_modality_image: bool(m.input_modality_image),
    input_modality_speech: bool(m.input_modality_speech),
    input_modality_video: bool(m.input_modality_video),
    output_modality_text: bool(m.output_modality_text),
    output_modality_image: bool(m.output_modality_image),
    output_modality_speech: bool(m.output_modality_speech),
    output_modality_video: bool(m.output_modality_video),
    omniscience_breakdown: compactOmniscience(m),
  };
}

export const getIntelligenceIndex = createSource<Record<string, never>, ArtificialAnalysisModel[]>({
  cacheKey: () => "aa-defaultData",
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const body = await fetchAaRsc(ctx, "/evaluations/artificial-analysis-intelligence-index");
    const raw = parseRscPayload<Record<string, unknown>>(body, "defaultData", (tree) =>
      findNextData(tree, "defaultData"),
    );
    const models = raw
      .map(compact)
      .sort((a, b) => (b.intelligence_index ?? -Infinity) - (a.intelligence_index ?? -Infinity));
    const invalid = models.filter((m) => !m.id || !m.name);
    if (invalid.length > 0) ctx.log("warn", `[artificial] ${invalid.length} models with empty id/name after mapping`);
    return { data: models };
  },
});

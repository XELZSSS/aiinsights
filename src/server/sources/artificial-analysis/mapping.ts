import { BENCHMARK_KEYS } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { num, str, strOr, bool, obj } from "@/server/parsers/primitives";
import { findArrayInTree } from "@/server/parsers/rsc";

/** Upstream field name for every benchmark key exposed by the API. */
const BENCHMARK_FIELDS: Record<(typeof BENCHMARK_KEYS)[number], string> = {
  aime25: "aime25",
  gpqa: "gpqa",
  hle: "hle",
  mmlu_pro: "mmluPro",
  livecodebench: "livecodebench",
  gdpval: "gdpval",
  scicode: "scicode",
  ifbench: "ifbench",
  lcr: "lcr",
  tau2: "tau2",
  tau_banking: "tauBanking",
  terminalbench_v2_1: "terminalbenchV21",
  terminalbench_hard: "terminalbenchHard",
  critpt: "critpt",
  apex_agents: "apexAgents",
  omniscience: "omniscience",
};

function compactBenchmarks(m: Record<string, unknown>): Record<string, number | null> {
  const benchmarks: Record<string, number | null> = {};
  for (const key of BENCHMARK_KEYS) {
    benchmarks[key] = num(m[BENCHMARK_FIELDS[key]]);
  }
  return benchmarks;
}

function compactCodingIndex(m: Record<string, unknown>): number | null {
  const tb = num(m.terminalbenchV21);
  const sc = num(m.scicode);
  if (tb == null && sc == null) return null;
  const values = [tb, sc].filter((v): v is number => v != null);
  return (values.reduce((a, b) => a + b, 0) / values.length) * 100;
}

/** Project one raw upstream model record onto the public ArtificialAnalysisModel shape. */
export function compact(m: Record<string, unknown>): ArtificialAnalysisModel {
  const creator = obj(m.creator);
  const agentic = num(m.analystAgent);
  const omniscience = num(m.omniscience);
  const omniscienceBreakdown = obj(m.omniscienceBreakdown);
  const cost = obj(m.intelligenceIndexCost);
  const timescale = obj(m.timescaleData);

  return {
    id: str(m.id) || str(m.slug),
    slug: str(m.slug),
    name: str(m.name),
    short_name: strOr(m.shortName),
    model_creators: creator ? { name: str(creator.name), color: str(creator.color) } : undefined,
    intelligence_index: num(m.intelligenceIndex),
    is_reasoning: bool(m.isReasoning),
    coding_index: compactCodingIndex(m),
    agentic_index: agentic != null ? agentic * 100 : null,
    release_date: strOr(m.releaseDate),
    is_open_weights: bool(m.isOpenWeights),
    context_window_tokens: num(m.contextWindowTokens),
    blended_price: num(m.price1mBlended7To2To1),
    cost: cost
      ? {
          total: num(cost.total),
          input: num(cost.input),
          output: num(cost.output),
          reasoning: num(cost.reasoning),
        }
      : undefined,
    benchmarks: compactBenchmarks(m),
    pricing: {
      input: num(m.price1mInputTokens),
      output: num(m.price1mOutputTokens),
      cache_hit: num(m.cacheHitPrice),
    },
    speed: {
      median_output_speed: num(timescale?.medianOutputSpeed) ?? num(m.medianCanonicalAnswerOutputSpeed),
    },
    reasoning_time_seconds: num(m.medianReasoningTimeSeconds),
    input_modality_text: bool(m.inputModalityText),
    input_modality_image: bool(m.inputModalityImage),
    input_modality_speech: bool(m.inputModalitySpeech),
    input_modality_video: bool(m.inputModalityVideo),
    output_modality_text: bool(m.outputModalityText),
    output_modality_image: bool(m.outputModalityImage),
    output_modality_speech: bool(m.outputModalitySpeech),
    output_modality_video: bool(m.outputModalityVideo),
    omniscience_breakdown:
      omniscienceBreakdown != null || omniscience != null
        ? {
            total: {
              accuracy: num(omniscienceBreakdown?.accuracy),
              attempt_rate: num(omniscienceBreakdown?.attemptRate),
              hallucination_rate: num(omniscienceBreakdown?.hallucinationRate),
              omniscience,
            },
          }
        : undefined,
  };
}

/** Partial fields merged into the catalog from the omniscience page. */
export function compactOmniscienceEnrich(m: Record<string, unknown>): Record<string, unknown> {
  const breakdown = obj(m.omniscienceBreakdown);
  return {
    slug: str(m.slug),
    omniscience: num(m.omniscience),
    omniscienceBreakdown:
      breakdown != null
        ? {
            accuracy: num(breakdown.accuracy),
            attemptRate: num(breakdown.attemptRate),
            hallucinationRate: num(breakdown.hallucinationRate),
          }
        : undefined,
  };
}

/** Partial fields merged into the catalog from the leaderboard page. */
export function compactLeaderboardEnrich(m: Record<string, unknown>): Record<string, unknown> {
  return {
    slug: str(m.slug),
    medianReasoningTimeSeconds: num(m.medianReasoningTimeSeconds),
  };
}

export function findLeaderboardModels(tree: unknown): Record<string, unknown>[] | null {
  return findArrayInTree<Record<string, unknown>>(
    tree,
    (m) => typeof m === "object" && m !== null && "medianReasoningTimeSeconds" in (m as Record<string, unknown>),
  );
}

/**
 * Merge the base catalog with enrichment lists by slug; first occurrence wins for
 * the catalog, later enrichments overlay their fields onto existing entries.
 */
export function mergeBySlug(
  catalog: Record<string, unknown>[],
  ...enrich: Record<string, unknown>[][]
): Record<string, unknown>[] {
  const merged = new Map<string, Record<string, unknown>>();
  for (const m of catalog) {
    const slug = str(m.slug);
    if (slug && !merged.has(slug)) merged.set(slug, { ...m });
  }
  for (const models of enrich) {
    for (const m of models) {
      const slug = str(m.slug);
      if (!slug) continue;
      const cur = merged.get(slug) ?? {};
      merged.set(slug, { ...cur, ...m });
    }
  }
  return [...merged.values()];
}

import { upstreamConfig, DEFAULT_TTL_MS, BENCHMARK_KEYS } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { num, str, strOr, bool, obj } from "@/server/parser/primitives";
import { findNextData, parseRscPayload } from "@/server/parser/rsc";
import { createSource } from "@/server/core/source";

const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%5D" } as const;

const INDEX_PATH = "/evaluations/artificial-analysis-intelligence-index";
const MODELS_PATH = "/models";
const OMNISCIENCE_PATH = "/evaluations/omniscience";

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

async function fetchAaRsc(ctx: AppContext, path: string): Promise<string> {
  return ctx.http.text(`${upstreamConfig.artificialAnalysis}${path}`, {
    headers: { ...RSC_HEADERS },
    retries: 0,
    timeoutMs: 30_000,
  });
}

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

function compact(m: Record<string, unknown>): ArtificialAnalysisModel {
  const creator = obj(m.creator);
  const agentic = num(m.analystAgent);
  const omniscience = num(m.omniscience);
  const omniscienceTotal = obj(obj(m.omniscience_breakdown)?.total);
  const cost = obj(m.intelligenceIndexCost);
  const timescale = obj(m.timescaleData);

  return {
    id: str(m.id) || str(m.slug),
    slug: str(m.slug),
    name: str(m.name),
    short_name: strOr(m.shortName),
    model_creators: creator ? { name: str(creator.name), color: str(creator.color) } : undefined,
    intelligence_index: num(m.intelligenceIndex),
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
    input_modality_text: bool(m.inputModalityText),
    input_modality_image: bool(m.inputModalityImage),
    input_modality_speech: bool(m.inputModalitySpeech),
    input_modality_video: bool(m.inputModalityVideo),
    output_modality_text: bool(m.outputModalityText),
    output_modality_image: bool(m.outputModalityImage),
    output_modality_speech: bool(m.outputModalitySpeech),
    output_modality_video: bool(m.outputModalityVideo),
    omniscience_breakdown:
      omniscienceTotal != null || omniscience != null
        ? {
            total: {
              accuracy: num(omniscienceTotal?.accuracy),
              attempt_rate: num(omniscienceTotal?.attempt_rate),
              hallucination_rate: num(omniscienceTotal?.hallucination_rate),
              omniscience: num(omniscienceTotal?.omniscience) ?? omniscience,
            },
          }
        : undefined,
  };
}

function compactOmniscienceEnrich(m: Record<string, unknown>): Record<string, unknown> {
  const total = obj(obj(m.omniscience_breakdown)?.total);
  return {
    slug: str(m.slug),
    omniscience: num(m.omniscience),
    omniscience_breakdown:
      total != null
        ? {
            total: {
              accuracy: num(total.accuracy),
              attempt_rate: num(total.attempt_rate),
              hallucination_rate: num(total.hallucination_rate),
              omniscience: num(total.omniscience),
            },
          }
        : undefined,
  };
}

function mergeBySlug(
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

export const getIntelligenceIndex = createSource<Record<string, never>, ArtificialAnalysisModel[]>({
  cacheKey: () => "aa-models-v2",
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const indexBody = await fetchAaRsc(ctx, INDEX_PATH);
    const indexModels = parseRscPayload<Record<string, unknown>>(indexBody, "initialModels", (tree) =>
      findNextData(tree, "initialModels"),
    );
    const catalog = parseRscPayload<Record<string, unknown>>(indexBody, "models", (tree) => {
      const arr = findNextData<Record<string, unknown>>(tree, "models");
      return Array.isArray(arr) && arr.length > 100 ? arr : null;
    });

    let modelsPageModels: Record<string, unknown>[] = [];
    try {
      const modelsBody = await fetchAaRsc(ctx, MODELS_PATH);
      modelsPageModels = parseRscPayload<Record<string, unknown>>(modelsBody, "initialModels", (tree) =>
        findNextData(tree, "initialModels"),
      );
    } catch (err) {
      ctx.log("warn", `[artificial] /models enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    let omniscienceEnrich: Record<string, unknown>[] = [];
    try {
      const omniscienceBody = await fetchAaRsc(ctx, OMNISCIENCE_PATH);
      const omniscienceModels = parseRscPayload<Record<string, unknown>>(
        omniscienceBody,
        "defaultData",
        (tree) => {
          const arr = findNextData<Record<string, unknown>>(tree, "defaultData");
          return Array.isArray(arr) && arr.some((m) => m.omniscience_breakdown != null) ? arr : null;
        },
      );
      omniscienceEnrich = (omniscienceModels ?? []).map(compactOmniscienceEnrich);
    } catch (err) {
      ctx.log("warn", `[artificial] omniscience enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const models = mergeBySlug(catalog, indexModels, modelsPageModels, omniscienceEnrich)
      .map(compact)
      .sort((a, b) => (b.intelligence_index ?? -Infinity) - (a.intelligence_index ?? -Infinity));
    const invalid = models.filter((m) => !m.slug || !m.name);
    if (invalid.length > 0) ctx.log("warn", `[artificial] ${invalid.length} models with empty slug/name after mapping`);
    return { data: models };
  },
});

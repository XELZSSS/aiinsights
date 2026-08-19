import { upstreamConfig, DEFAULT_TTL_MS, BENCHMARK_KEYS } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { num, str, strOr, bool, obj } from "@/server/parsers/primitives";
import { findNextData, parseRscPayload } from "@/server/parsers/rsc";
import { createSource } from "@/server/core/source";

const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%5D" } as const;

const INDEX_PATH = "/evaluations/artificial-analysis-intelligence-index";
const MODELS_PATH = "/models";
const OMNISCIENCE_PATH = "/evaluations/omniscience";
const LEADERBOARD_PATH = "/leaderboards/models";

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

function compactOmniscienceEnrich(m: Record<string, unknown>): Record<string, unknown> {
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

function compactLeaderboardEnrich(m: Record<string, unknown>): Record<string, unknown> {
  return {
    slug: str(m.slug),
    medianReasoningTimeSeconds: num(m.medianReasoningTimeSeconds),
  };
}

function findLeaderboardModels(tree: unknown): Record<string, unknown>[] | null {
  const stack: unknown[] = [tree];
  let best: Record<string, unknown>[] | null = null;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      if (
        current.some(
          (m) => m && typeof m === "object" && "medianReasoningTimeSeconds" in (m as Record<string, unknown>),
        )
      ) {
        const arr = current as Record<string, unknown>[];
        if (!best || arr.length > best.length) best = arr;
      }
      for (const v of current) stack.push(v);
    } else {
      for (const v of Object.values(current)) stack.push(v);
    }
  }
  return best;
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
  cacheKey: () => "aa-models-v3",
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
      const omniscienceModels = parseRscPayload<Record<string, unknown>>(omniscienceBody, "initialModels", (tree) => {
        const arr = findNextData<Record<string, unknown>>(tree, "initialModels");
        return Array.isArray(arr) && arr.some((m) => m.omniscienceBreakdown != null) ? arr : null;
      });
      omniscienceEnrich = (omniscienceModels ?? []).map(compactOmniscienceEnrich);
    } catch (err) {
      ctx.log(
        "warn",
        `[artificial] omniscience enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let leaderboardEnrich: Record<string, unknown>[] = [];
    try {
      const leaderboardBody = await fetchAaRsc(ctx, LEADERBOARD_PATH);
      const leaderboardModels = parseRscPayload<Record<string, unknown>>(
        leaderboardBody,
        "models",
        findLeaderboardModels,
      );
      leaderboardEnrich = (leaderboardModels ?? []).map(compactLeaderboardEnrich);
    } catch (err) {
      ctx.log(
        "warn",
        `[artificial] leaderboard enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const models = mergeBySlug(catalog, indexModels, modelsPageModels, omniscienceEnrich, leaderboardEnrich)
      .map(compact)
      .sort((a, b) => (b.intelligence_index ?? -Infinity) - (a.intelligence_index ?? -Infinity));
    const invalid = models.filter((m) => !m.slug || !m.name);
    if (invalid.length > 0) ctx.log("warn", `[artificial] ${invalid.length} models with empty slug/name after mapping`);
    return { data: models };
  },
});

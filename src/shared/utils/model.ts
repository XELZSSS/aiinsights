import type { ArtificialAnalysisModel, OpenRouterRankEntry } from "@/shared/types";
import type { ModelSource } from "@/shared/config";

export function modelId(m: { id?: string; slug?: string }): string {
  return m.id || m.slug || "";
}

export function modelDetailPath(source: ModelSource, id: string): string {
  return `/model/${source}/${id}`;
}

export function modelInputPrice(model: ArtificialAnalysisModel): number | null | undefined {
  return model.pricing?.input;
}

export function modelOutputPrice(model: ArtificialAnalysisModel): number | null | undefined {
  return model.pricing?.output;
}

export function modelCacheHitPrice(model: ArtificialAnalysisModel): number | null | undefined {
  return model.pricing?.cache_hit;
}

export function openRouterPromptPrice(entry: OpenRouterRankEntry): number | null | undefined {
  return entry.pricing?.prompt;
}

export function openRouterCompletionPrice(entry: OpenRouterRankEntry): number | null | undefined {
  return entry.pricing?.completion;
}

export function findModel<T>(data: T[], id: string, ...keys: (keyof T & string)[]): T | undefined {
  return data.find((item) => keys.some((key) => (item as Record<string, unknown>)[key] === id));
}

export interface CostEstimateOptions {
  cacheHitRate?: number;
  reasoningTokens?: number;
}

export function calcModelCost(
  model: ArtificialAnalysisModel,
  promptTokens: number,
  completionTokens: number,
  opts?: CostEstimateOptions,
): number | null {
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) return null;
  const pt = Math.max(0, promptTokens);
  const ct = Math.max(0, completionTokens);
  const pricing = model.pricing;
  if (!pricing) return null;
  const input = pricing.input;
  const output = pricing.output;
  if (typeof input !== "number" || typeof output !== "number") return null;

  const hitRate = Math.max(0, Math.min(1, opts?.cacheHitRate ?? 0));
  const cached = typeof pricing.cache_hit === "number" ? pricing.cache_hit : input;
  const inputRate = (1 - hitRate) * input + hitRate * cached;
  const reasoning = Math.max(0, opts?.reasoningTokens ?? 0);
  return (pt / 1_000_000) * inputRate + ((ct + reasoning) / 1_000_000) * output;
}

export interface MonthlyCostOptions {
  dailyInput: number;
  dailyOutput: number;
  dailyReasoning?: number;
  cacheHitRate: number;
  daysPerMonth: number;
}

export function calcMonthlyCost(model: ArtificialAnalysisModel, opts: MonthlyCostOptions): number | null {
  const daily = calcModelCost(model, opts.dailyInput, opts.dailyOutput, {
    cacheHitRate: opts.cacheHitRate,
    reasoningTokens: opts.dailyReasoning,
  });
  if (daily == null) return null;
  return daily * Math.max(1, opts.daysPerMonth);
}

export function getOutputSpeed(model: ArtificialAnalysisModel): number | null {
  return model.speed?.median_output_speed ?? null;
}

export function groupByProvider(models: ArtificialAnalysisModel[]) {
  const providers = new Map<string, { name: string; color: string; models: ArtificialAnalysisModel[] }>();
  for (const m of models) {
    const name = m.model_creators?.name || "Unknown";
    const color = m.model_creators?.color || "var(--text-tertiary)";
    let bucket = providers.get(name);
    if (!bucket) {
      bucket = { name, color, models: [] };
      providers.set(name, bucket);
    }
    bucket.models.push(m);
  }
  return Array.from(providers.values());
}

function avg(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export interface ProviderStats {
  name: string;
  color: string;
  count: number;
  avgPrice: number | null;
  avgSpeed: number | null;
  avgIntelligence: number | null;
}

export function computeProviderStats(models: ArtificialAnalysisModel[]): ProviderStats[] {
  return groupByProvider(models)
    .map(({ name, color, models: group }) => {
      const count = group.length;
      const avgPrice = avg(group.map((m) => m.pricing?.input).filter((p): p is number => p != null));
      const avgSpeed = avg(group.map(getOutputSpeed).filter((s): s is number => s != null));
      const avgIntelligence = avg(group.map((m) => m.intelligence_index).filter((i): i is number => i != null));
      return { name, color, count, avgPrice, avgSpeed, avgIntelligence };
    })
    .sort((a, b) => b.count - a.count);
}

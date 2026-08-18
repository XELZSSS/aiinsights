import type { ArtificialAnalysisModel } from "@/shared/types";

export function modelId(m: { id?: string; slug?: string }): string {
  return m.id || m.slug || "";
}

export function findModel<T>(data: T[], id: string, ...keys: (keyof T & string)[]): T | undefined {
  return data.find((item) => keys.some((key) => (item as Record<string, unknown>)[key] === id));
}

export function calcModelCost(
  model: ArtificialAnalysisModel,
  promptTokens: number,
  completionTokens: number,
): number | null {
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) return null;
  const pt = Math.max(0, promptTokens);
  const ct = Math.max(0, completionTokens);
  const pricing = model.pricing;
  if (!pricing) return null;
  if (Number.isFinite(pricing.input) && Number.isFinite(pricing.output)) {
    return (pt / 1_000_000) * pricing.input! + (ct / 1_000_000) * pricing.output!;
  }
  return null;
}

export function getOutputSpeed(model: ArtificialAnalysisModel): number | null {
  return model.speed?.median_output_speed ?? null;
}

export function groupByProvider(models: ArtificialAnalysisModel[]) {
  const providers = new Map<string, { name: string; color: string; models: ArtificialAnalysisModel[] }>();
  for (const m of models) {
    const name = m.model_creators?.name || "Unknown";
    const color = m.model_creators?.color || "#78716c";
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

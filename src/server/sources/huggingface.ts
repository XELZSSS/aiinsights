import { upstreamConfig, DEFAULT_TTL_MS, cacheKeys } from "@/shared/config";
import type { OpenSourceModelEntry } from "@/shared/types";
import type { AppContext } from "@/server/app";
import { createSource } from "@/server/core/source";
import { getOpenLicense } from "@/server/parsers/licenses";

interface HFModel {
  id?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string | null;
  createdAt?: string | null;
  lastModified?: string | null;
  tags?: string[];
}

interface ModelQuery {
  sort: string;
  direction: string;
  limit: number;
}

function mapModel(m: HFModel): OpenSourceModelEntry {
  const id = m.id || "";
  return {
    id,
    author: m.author || id.split("/")[0] || "unknown",
    downloads: m.downloads ?? 0,
    likes: m.likes ?? 0,
    license: getOpenLicense(m.tags ?? []) ?? "unknown",
    task: m.pipeline_tag || null,
    createdAt: m.createdAt || null,
    lastModified: m.lastModified || null,
    tags: m.tags ?? [],
  };
}

const HF_API = upstreamConfig.huggingface;

function effectiveDirection(p: ModelQuery): string {
  return p.sort === "createdAt" ? p.direction : "-1";
}

export const getModels = createSource<ModelQuery, OpenSourceModelEntry[]>({
  cacheKey: (p) => cacheKeys.openSourceModels(p.sort, effectiveDirection(p), p.limit),
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext, p) => {
    const direction = effectiveDirection(p);
    const items = await ctx.http.json<HFModel[]>(
      `${HF_API}?sort=${p.sort}&direction=${direction}&limit=${p.limit}&full=true`,
    );
    if (!Array.isArray(items))
      throw new Error(`HuggingFace API returned non-array response (got ${items === null ? "null" : typeof items})`);
    return { data: items.map(mapModel).filter((m) => m.downloads > 0) };
  },
});

export const getReleases = createSource<Record<string, never>, OpenSourceModelEntry[]>({
  cacheKey: () => cacheKeys.openSourceReleases,
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const items = await ctx.http.json<HFModel[]>(`${HF_API}?sort=createdAt&direction=-1&limit=500&full=true`);
    if (!Array.isArray(items))
      throw new Error(`HuggingFace API returned non-array response (got ${items === null ? "null" : typeof items})`);
    const releases = items
      .filter(
        (m) =>
          Array.isArray(m.tags) &&
          getOpenLicense(m.tags) !== null &&
          typeof m.createdAt === "string" &&
          m.createdAt.length > 0,
      )
      .map(mapModel)
      .sort((a, b) => {
        const da = Date.parse(a.createdAt!);
        const db = Date.parse(b.createdAt!);
        if (Number.isNaN(da) && Number.isNaN(db)) return 0;
        if (Number.isNaN(da)) return 1;
        if (Number.isNaN(db)) return -1;
        return db - da;
      });
    return { data: releases };
  },
});

import { upstreamConfig, DEFAULT_TTL_MS } from "../../shared/config";
import { getOpenLicense } from "../parser";
import type { OpenSourceModelEntry } from "../../shared/types";
import { createSource } from "./misc";
import type { AppContext } from "../context";

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
const ALLOWED_SORT = new Set(["trendingScore", "downloads", "likes", "createdAt", "lastModified"]);
const ALLOWED_DIR = new Set(["-1", "1"]);

export const getModels = createSource<{ sort: string; direction: string; limit: number }, OpenSourceModelEntry[]>({
  cacheKey: (p) => `opensource-models:${p.sort}:${p.direction}:${p.limit}`,
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext, p) => {
    const safeSort = ALLOWED_SORT.has(p.sort) ? p.sort : "trendingScore";
    const safeDir = ALLOWED_DIR.has(p.direction) ? p.direction : "-1";
    const safeLimit = Math.min(Math.max(Math.floor(p.limit) || 50, 1), 500);
    const items = await ctx.http.json<HFModel[]>(`${HF_API}?sort=${safeSort}&direction=${safeDir}&limit=${safeLimit}&full=true`);
    if (!Array.isArray(items)) throw new Error(`HuggingFace API returned non-array response (got ${items === null ? "null" : typeof items})`);
    return { data: items.map(mapModel).filter((m) => m.downloads > 0) };
  },
});

export const getReleases = createSource<Record<string, never>, OpenSourceModelEntry[]>({
  cacheKey: () => "opensource-releases",
  defaultTtl: DEFAULT_TTL_MS,
  fetch: async (ctx: AppContext) => {
    const items = await ctx.http.json<HFModel[]>(`${HF_API}?sort=createdAt&direction=-1&limit=500&full=true`);
    const releases = items
      .filter((m) => Array.isArray(m.tags) && getOpenLicense(m.tags) !== null && typeof m.createdAt === "string" && m.createdAt.length > 0)
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

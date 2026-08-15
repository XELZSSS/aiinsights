import { HEALTH_TIMEOUT_MS, upstreamConfig, HEALTH_TTL_MS, START_MARKER_TTL_MS } from "../../shared/config";
import type { HealthEntry, SystemStats } from "../../shared/types";
import type { AppContext } from "../context";
import { parseRscPayload } from "../parser";

export interface SourceResult<Data> {
  data: Data;
  ttl?: number;
}

export type SourceFn<Params, Data> = (ctx: AppContext, params: Params) => Promise<Data>;

/**
 * Wrap a producer into a cached/validated source function. Caching uses the
 * current AppContext (version-prefixed), and the producer may return a shorter
 * TTL on partial failure so degraded data is not pinned for the full window.
 */
export function createSource<Params, Data>(opts: {
  cacheKey: (params: Params) => string;
  defaultTtl: number;
  fetch: (ctx: AppContext, params: Params) => Promise<SourceResult<Data>>;
}): SourceFn<Params, Data> {
  return (ctx, params) => ctx.cache.withTtl(opts.cacheKey(params), opts.defaultTtl, () => opts.fetch(ctx, params));
}

export function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export function settledValues<T>(results: readonly PromiseSettledResult<T>[]): T[] {
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export function deduplicateBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatSettleErrors(results: readonly PromiseSettledResult<unknown>[], labels: readonly string[]): string {
  return results
    .map((r, i) => (r.status === "rejected" ? `${labels[i] ?? i}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}` : null))
    .filter(Boolean)
    .join("; ");
}

const RSC_HEADERS = { RSC: "1", "Next-Router-State-Tree": "%5B%5D" } as const;
const RSC_TIMEOUT_MS = 30_000;

export async function fetchAaRsc(ctx: AppContext, path: string): Promise<string> {
  return ctx.http.text(`${upstreamConfig.artificialAnalysis}${path}`, {
    headers: { ...RSC_HEADERS },
    retries: 0,
    timeoutMs: RSC_TIMEOUT_MS,
  });
}

export function parseAaPayload<T>(body: string, marker: string, extract: (tree: unknown) => T[] | null): T[] {
  return parseRscPayload(body, marker, extract);
}

async function probe(ctx: AppContext, name: string, url: string, apiPath?: string): Promise<HealthEntry> {
  try {
    const { responseTime, statusCode } = await ctx.http.probe(url, HEALTH_TIMEOUT_MS);
    return { name, status: "ok", detail: "reachable", responseTime, statusCode, url: apiPath || url };
  } catch (e: unknown) {
    return {
      name,
      status: "error",
      detail: e instanceof Error ? e.message : "unknown error",
      responseTime: 0,
      statusCode: null,
      url: apiPath || url,
    };
  }
}

export const checkAllUpstreams = createSource<Record<string, never>, HealthEntry[]>({
  cacheKey: () => "health",
  defaultTtl: HEALTH_TTL_MS,
  fetch: (ctx: AppContext) =>
    Promise.all([
      probe(ctx, "HuggingFace Models", `${upstreamConfig.huggingface}?limit=1`, "/api/open-source-models"),
      probe(ctx, "HuggingFace Releases", `${upstreamConfig.huggingface}?sort=createdAt&direction=-1&limit=1`, "/api/open-source-releases"),
      probe(ctx, "Artificial Analysis", upstreamConfig.artificialAnalysis, "/api/artificial-analysis-index"),
      probe(ctx, "OpenRouter Rankings", `${upstreamConfig.openrouter}/api/v1/models`, "/api/openrouter-rankings"),
      probe(ctx, "Arena.ai Leaderboard", "https://arena.ai/", "/api/arena-leaderboard"),
      probe(ctx, "Polymarket Predictions", "https://gamma-api.polymarket.com/markets?limit=1", "/api/predictions"),
    ]).then((data) => ({ data })),
});

const START_KEY = "system:start-ts";

export const getSystemStats = createSource<Record<string, never>, SystemStats>({
  cacheKey: () => "system-stats",
  defaultTtl: 60_000,
  fetch: async (ctx: AppContext) => {
    const stored = await ctx.cache.get<number>(START_KEY);
    const startTime = stored !== null && stored > 0 ? stored : ctx.now();
    if (stored === null) {
      try {
        await ctx.cache.set(START_KEY, startTime, START_MARKER_TTL_MS);
      } catch {
        void 0;
      }
    }
    return {
      data: {
        runtime: ctx.env.METRICS ? "cloudflare" : "standard",
        uptime: Math.max(0, Math.floor((ctx.now() - startTime) / 1000)),
      },
      ttl: 60_000,
    };
  },
});
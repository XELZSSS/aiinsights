import { upstreamConfig, rssConfig, cacheKeys } from "@/shared/config";
import type { AppContext } from "@/server/context";
import { createSource } from "@/server/core/source";
import type { SourceStatus, SourcesStatusPayload } from "@/shared/types";
import { getUptime } from "@/server/sources/uptime";

const STATUS_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 8_000;

type SourcesStatusData = Omit<SourcesStatusPayload, "firstLaunchAt" | "uptimeMs">;

interface ProbeTarget {
  id: SourceStatus["id"];
  url: string;
}

function buildTargets(): ProbeTarget[] {
  const newsFeeds = Array.from(
    new Set(
      Object.values(rssConfig)
        .flatMap((urls) => urls)
        .slice(0, 4),
    ),
  );
  return [
    { id: "arena", url: `${upstreamConfig.arena}/text` },
    {
      id: "artificialAnalysis",
      url: `${upstreamConfig.artificialAnalysis}/evaluations/artificial-analysis-intelligence-index`,
    },
    { id: "huggingface", url: `${upstreamConfig.huggingface}?limit=1` },
    { id: "openrouter", url: `${upstreamConfig.openrouter}/api/v1/models` },
    ...newsFeeds.map((url) => ({ id: "news", url }) as ProbeTarget),
  ];
}

async function checkSources(ctx: AppContext): Promise<SourcesStatusData> {
  const targets = buildTargets();
  const results = await Promise.allSettled(
    targets.map(async (target) => ({ target, probe: await ctx.http.probe(target.url, PROBE_TIMEOUT_MS) })),
  );

  const checkedAt = new Date().toISOString();
  const grouped = new Map<SourceStatus["id"], SourceStatus & { total: number; failures: number }>();

  for (const result of results) {
    // A rejected probe (should not happen: probe catches internally) counts as a failed target.
    const { target, probe } =
      result.status === "fulfilled"
        ? result.value
        : { target: null, probe: { ok: false, status: null, latencyMs: null, error: "probe error" } };
    if (!target) continue;
    const existing = grouped.get(target.id);
    if (!existing) {
      grouped.set(target.id, {
        id: target.id,
        ok: probe.ok,
        status: probe.status,
        latencyMs: probe.latencyMs,
        error: probe.error,
        checkedAt,
        total: 1,
        failures: probe.ok ? 0 : 1,
      });
      continue;
    }
    existing.total += 1;
    existing.ok = existing.ok || probe.ok;
    existing.failures += probe.ok ? 0 : 1;
    if (probe.ok) {
      if (existing.latencyMs == null || (probe.latencyMs ?? 0) < existing.latencyMs) {
        existing.latencyMs = probe.latencyMs;
        existing.status = probe.status;
      }
      existing.error = null;
    } else if (!existing.error) {
      existing.error = probe.error;
    }
  }

  const sources: SourceStatus[] = Array.from(grouped.values()).map((s) => {
    if (s.ok) return { id: s.id, ok: true, status: s.status, latencyMs: s.latencyMs, error: null, checkedAt };
    return {
      id: s.id,
      ok: false,
      status: s.status,
      latencyMs: s.latencyMs,
      error: s.total > 1 ? `${s.failures}/${s.total} feeds failed` : s.error,
      checkedAt,
    };
  });

  return { sources, checkedAt };
}

// Internal: cached probe of every upstream source.
const getSourcesStatus = createSource<Record<string, never>, SourcesStatusData>({
  cacheKey: () => cacheKeys.sourcesStatus,
  defaultTtl: STATUS_TTL_MS,
  fetch: async (ctx: AppContext) => ({ data: await checkSources(ctx) }),
});

// Internal: force a fresh probe round and seed the cache with it.
const refreshSourcesStatus = async (ctx: AppContext): Promise<SourcesStatusData> => {
  const data = await checkSources(ctx);
  try {
    await ctx.cache.set(cacheKeys.sourcesStatus, data, STATUS_TTL_MS);
  } catch {
    // Cache seeding is best-effort; the fresh payload is still returned.
  }
  return data;
};

export const getSourcesStatusFull = async (ctx: AppContext, refresh: boolean): Promise<SourcesStatusPayload> => {
  const status = refresh ? await refreshSourcesStatus(ctx) : await getSourcesStatus(ctx, {});
  const uptime = await getUptime(ctx);
  return { ...status, ...uptime };
};

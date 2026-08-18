import { upstreamConfig, rssConfig } from "@/shared/config";
import type { AppContext } from "@/server/app";
import { createSource } from "@/server/core/source";
import type { SourceStatus, SourcesStatusPayload } from "@/shared/types";

const STATUS_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 8_000;

type SourcesStatusData = Omit<SourcesStatusPayload, "firstLaunchAt" | "uptimeMs">;

interface ProbeTarget {
  id: SourceStatus["id"];
  name: string;
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
    { id: "arena", name: "arena.ai", url: `${upstreamConfig.arena}/text` },
    {
      id: "artificialAnalysis",
      name: "Artificial Analysis",
      url: `${upstreamConfig.artificialAnalysis}/evaluations/artificial-analysis-intelligence-index`,
    },
    { id: "huggingface", name: "Hugging Face", url: `${upstreamConfig.huggingface}?limit=1` },
    { id: "openrouter", name: "OpenRouter", url: `${upstreamConfig.openrouter}/api/v1/models` },
    ...newsFeeds.map((url) => ({ id: "news", name: "News RSS", url }) as ProbeTarget),
  ];
}

async function checkSources(ctx: AppContext): Promise<SourcesStatusData> {
  const targets = buildTargets();
  const results = await Promise.allSettled(
    targets.map(async (target) => ({ target, probe: await ctx.http.probe(target.url, PROBE_TIMEOUT_MS) })),
  );

  const checkedAt = new Date().toISOString();
  const grouped = new Map<SourceStatus["id"], SourceStatus & { total: number; failures: number }>();

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const result = results[i]!;
    const probe =
      result.status === "fulfilled"
        ? result.value.probe
        : { ok: false, status: null, latencyMs: null, error: "probe error" };
    const existing = grouped.get(target.id);
    if (!existing) {
      grouped.set(target.id, {
        id: target.id,
        name: target.name,
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
    if (s.ok)
      return { id: s.id, name: s.name, ok: true, status: s.status, latencyMs: s.latencyMs, error: null, checkedAt };
    return {
      id: s.id,
      name: s.name,
      ok: false,
      status: s.status,
      latencyMs: s.latencyMs,
      error: s.total > 1 ? `${s.failures}/${s.total} feeds failed` : s.error,
      checkedAt,
    };
  });

  return { sources, checkedAt };
}

export const getSourcesStatus = createSource<Record<string, never>, SourcesStatusData>({
  cacheKey: () => "sources-status",
  defaultTtl: STATUS_TTL_MS,
  fetch: async (ctx: AppContext) => ({ data: await checkSources(ctx) }),
});

export const refreshSourcesStatus = (ctx: AppContext): Promise<SourcesStatusData> => checkSources(ctx);

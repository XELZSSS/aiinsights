import { useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type {
  ArtificialAnalysisModel,
  HallucinationRankingEntry,
  NewsItem,
  OpenSourceModelEntry,
  OpenRouterRankingsPayload,
  HealthEntry,
  SystemStats,
  TtsModel,
  HomeDashboardData,
} from "@/shared/types";
import { HEALTH_CHECK_INTERVAL, SYSTEM_STATS_INTERVAL, FIVE_MINUTES, THIRTY_MINUTES, apiBase } from "@/shared/config";
import { normalizePercent } from "@/shared/utils";

const FETCH_TIMEOUT_MS = 30_000;

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = apiBase && path.startsWith("/") ? apiBase + path : path;
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const merged = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: merged,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return ((await res.json()) as { data: T }).data;
}

const api = {
  artificialIndex: "/api/artificial-analysis-index",
  openSourceModels: (sort = "trendingScore", direction = "-1", limit = 500) =>
    `/api/open-source-models?sort=${sort}&direction=${direction}&limit=${limit}`,
  openSourceReleases: "/api/open-source-releases",
  openRouterRankings: "/api/openrouter-rankings",
  ttsLeaderboard: "/api/tts-leaderboard",
  health: "/api/health",
  systemStats: "/api/system-stats",
  news: (category: string) => `/api/news?category=${encodeURIComponent(category)}`,
  homeDashboard: "/api/home-dashboard",
} as const;

interface QueryCtx {
  signal?: AbortSignal;
}

const fetcher =
  <T>(path: string) =>
  ({ signal }: QueryCtx) =>
    apiFetch<T>(path, signal);

function createApiQuery<T>(
  key: string[],
  path: string,
  opts?: { staleTime?: number; refetchInterval?: number | false },
) {
  const qf = fetcher<T>(path);
  return {
    use: (enabled = true) => useQuery<T>({ queryKey: key, queryFn: qf, ...opts, enabled }),
    useSuspense: () => useSuspenseQuery<T>({ queryKey: key, queryFn: qf, ...opts }),
  };
}

const qArtificial = createApiQuery<ArtificialAnalysisModel[]>(
  ["api", "artificial-analysis-index"],
  api.artificialIndex,
  { staleTime: THIRTY_MINUTES },
);
const qTts = createApiQuery<TtsModel[]>(["api", "tts-leaderboard"], api.ttsLeaderboard, { staleTime: THIRTY_MINUTES });
const qOpenSourceReleases = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-releases"],
  api.openSourceReleases,
  { staleTime: THIRTY_MINUTES },
);
const qOpenRouter = createApiQuery<OpenRouterRankingsPayload>(["api", "openrouter-rankings"], api.openRouterRankings, {
  staleTime: FIVE_MINUTES,
});
const qHealth = createApiQuery<HealthEntry[]>(["api", "health"], api.health, {
  staleTime: 0,
  refetchInterval: HEALTH_CHECK_INTERVAL,
});
const qSystemStats = createApiQuery<SystemStats>(["api", "system-stats"], api.systemStats, {
  staleTime: 0,
  refetchInterval: SYSTEM_STATS_INTERVAL,
});
const qHomeDashboard = createApiQuery<HomeDashboardData>(["api", "home-dashboard"], api.homeDashboard, {
  staleTime: FIVE_MINUTES,
});
const qOpenSourceModels = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-models"],
  api.openSourceModels(),
  { staleTime: FIVE_MINUTES },
);
const qOpenSourceSearch = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-models", "search"],
  api.openSourceModels("trendingScore", "-1", 20),
  {
    staleTime: FIVE_MINUTES,
  },
);

export const useArtificialRankings = qArtificial.use;
export const useSuspenseArtificialRankings = qArtificial.useSuspense;
export const useTtsLeaderboard = qTts.use;
export const useSuspenseTtsLeaderboard = qTts.useSuspense;
export const useSuspenseOpenSourceReleases = qOpenSourceReleases.useSuspense;
export const useSuspenseHealthStatus = qHealth.useSuspense;
export const useSystemStats = qSystemStats.use;
export const useSuspenseHomeDashboard = qHomeDashboard.useSuspense;
export const useOpenRouterRankings = qOpenRouter.use;
export const useSuspenseOpenRouterRankings = qOpenRouter.useSuspense;
export const useOpenSourceModels = qOpenSourceModels.use;
export const useOpenSourceSearchModels = qOpenSourceSearch.use;

const newsQueries = new Map<string, ReturnType<typeof createApiQuery<NewsItem[]>>>();

function getNewsQuery(category: string) {
  let query = newsQueries.get(category);
  if (!query) {
    query = createApiQuery<NewsItem[]>(["api", "news", category], api.news(category), {
      staleTime: THIRTY_MINUTES,
      refetchInterval: THIRTY_MINUTES,
    });
    newsQueries.set(category, query);
  }
  return query;
}

export function useNewsByCategory(category: string) {
  return getNewsQuery(category).use();
}

function buildHallucinationRankings(models: ArtificialAnalysisModel[]): HallucinationRankingEntry[] {
  return models
    .flatMap((model) => {
      const total = model.omniscience_breakdown?.total;
      const rate = normalizePercent(total?.hallucination_rate);
      const acc = normalizePercent(total?.accuracy);
      const attempt = normalizePercent(total?.attempt_rate);
      const idx = normalizePercent(total?.omniscience);
      if (rate == null || acc == null || attempt == null || idx == null) return [];
      return [
        {
          id: model.id,
          slug: model.slug,
          model: model.name,
          hallucinationRate: rate,
          accuracy: acc,
          attemptRate: attempt,
          omniscienceIndex: idx,
        },
      ];
    })
    .sort((a, b) => a.hallucinationRate - b.hallucinationRate);
}

export function useHallucinationRankings(data: ArtificialAnalysisModel[], enabled = true): HallucinationRankingEntry[] {
  return useMemo(() => (enabled && data.length > 0 ? buildHallucinationRankings(data) : []), [data, enabled]);
}

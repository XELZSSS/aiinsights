import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  ArtificialAnalysisModel,
  NewsItem,
  NewsCategory,
  OpenSourceModelEntry,
  OpenRouterRankingsPayload,
  HomeDashboardData,
  SourcesStatusPayload,
} from "@/shared/types";
import { FIVE_MINUTES, THIRTY_MINUTES } from "@/shared/config";
import { apiPaths, fetcher, apiFetch, type QueryCtx } from "@/app/api/client";

function createApiQuery<T>(
  key: string[],
  path: string,
  opts?: {
    staleTime?: number;
    refetchInterval?: number | false;
    queryFn?: (ctx: QueryCtx) => Promise<T>;
  },
) {
  const { queryFn, ...queryOpts } = opts ?? {};
  const qf = queryFn ?? fetcher<T>(path);
  return {
    use: (enabled = true) => useQuery<T>({ queryKey: key, queryFn: qf, ...queryOpts, enabled }),
    useSuspense: () => useSuspenseQuery<T>({ queryKey: key, queryFn: qf, ...queryOpts }),
  };
}

const qArtificial = createApiQuery<ArtificialAnalysisModel[]>(
  ["api", "artificial-analysis-index"],
  apiPaths.artificialIndex,
  { staleTime: THIRTY_MINUTES },
);
const qOpenSourceReleases = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-releases"],
  apiPaths.openSourceReleases,
  { staleTime: THIRTY_MINUTES },
);
const qOpenRouter = createApiQuery<OpenRouterRankingsPayload>(
  ["api", "openrouter-rankings"],
  apiPaths.openRouterRankings,
  {
    staleTime: FIVE_MINUTES,
  },
);
const qHomeDashboard = createApiQuery<HomeDashboardData>(["api", "home-dashboard"], apiPaths.homeDashboard, {
  staleTime: FIVE_MINUTES,
});
const qOpenSourceModels = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-models"],
  apiPaths.openSourceModels(),
  { staleTime: FIVE_MINUTES },
);
const qNews = (category: NewsCategory) =>
  createApiQuery<NewsItem[]>(["api", "news", category], apiPaths.news(category), {
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
  });
const fetchSourcesStatus =
  (refresh: boolean) =>
  ({ signal }: QueryCtx): Promise<SourcesStatusPayload> =>
    apiFetch<SourcesStatusPayload>(refresh ? `${apiPaths.sourcesStatus}?refresh=1` : apiPaths.sourcesStatus, signal, {
      cache: "no-store",
    });

const qSourcesStatus = createApiQuery<SourcesStatusPayload>(["api", "sources-status"], apiPaths.sourcesStatus, {
  staleTime: 60_000,
  refetchInterval: 60_000,
  queryFn: fetchSourcesStatus(false),
});

export const useArtificialRankings = qArtificial.use;
export const useSuspenseArtificialRankings = qArtificial.useSuspense;
export const useSuspenseHomeDashboard = qHomeDashboard.useSuspense;
export const useOpenRouterRankings = qOpenRouter.use;
export const useSuspenseOpenRouterRankings = qOpenRouter.useSuspense;
export const useOpenSourceModels = qOpenSourceModels.use;
export const useSuspenseOpenSourceReleases = qOpenSourceReleases.useSuspense;
export const useNewsByCategory = (category: NewsCategory) => qNews(category).use();

export type SourcesStatusQuery = UseQueryResult<SourcesStatusPayload> & {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useSourcesStatus(): SourcesStatusQuery {
  const queryClient = useQueryClient();
  const query = qSourcesStatus.use();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await apiFetch<SourcesStatusPayload>(`${apiPaths.sourcesStatus}?refresh=1`, undefined, {
        cache: "no-store",
      });
      queryClient.setQueryData(["api", "sources-status"], fresh);
    } catch {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, query.refetch]);

  return { ...query, isRefreshing, refresh };
}

export interface OpenSourceModelsQuery {
  data: OpenSourceModelEntry[];
  isPending: boolean;
  isError: boolean;
}

export function useAllOpenSourceModels(enabled = true): OpenSourceModelsQuery {
  const trending = qOpenSourceModels.use(enabled);
  const releases = qOpenSourceReleases.use(enabled);

  const data = useMemo(() => {
    const seen = new Set<string>();
    return [...(trending.data ?? []), ...(releases.data ?? [])].filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [trending.data, releases.data]);

  return {
    data,
    isPending: enabled && (trending.isPending || releases.isPending),
    isError: enabled && (trending.isError || releases.isError),
  };
}

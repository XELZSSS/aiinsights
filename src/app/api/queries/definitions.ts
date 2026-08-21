import type {
  ArtificialAnalysisModel,
  HomeDashboardData,
  NewsCategory,
  NewsItem,
  OpenSourceModelEntry,
  OpenRouterRankingsPayload,
  SourcesStatusPayload,
} from "@/shared/types";
import { FIVE_MINUTES, THIRTY_MINUTES } from "@/shared/config";
import { apiFetch, apiPaths, type QueryCtx } from "@/app/api/client";
import { createApiQuery } from "./base";
import { queryKeys } from "./keys";

// Index-like data changes slowly (cached 30 min); rankings and the dashboard poll every 5 min.
export const qArtificial = createApiQuery<ArtificialAnalysisModel[]>(
  queryKeys.artificialIndex,
  apiPaths.artificialIndex,
  {
    staleTime: THIRTY_MINUTES,
  },
);
export const qOpenSourceReleases = createApiQuery<OpenSourceModelEntry[]>(
  queryKeys.openSourceReleases,
  apiPaths.openSourceReleases,
  { staleTime: THIRTY_MINUTES },
);
export const qOpenRouter = createApiQuery<OpenRouterRankingsPayload>(
  queryKeys.openRouterRankings,
  apiPaths.openRouterRankings,
  {
    staleTime: FIVE_MINUTES,
  },
);
export const qHomeDashboard = createApiQuery<HomeDashboardData>(queryKeys.homeDashboard, apiPaths.homeDashboard, {
  staleTime: FIVE_MINUTES,
});
export const qOpenSourceModels = createApiQuery<OpenSourceModelEntry[]>(
  queryKeys.openSourceModels,
  apiPaths.openSourceModels(),
  {
    staleTime: FIVE_MINUTES,
  },
);
export const qNews = (category: NewsCategory) =>
  createApiQuery<NewsItem[]>(queryKeys.news(category), apiPaths.news(category), {
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
  });

// ?refresh=1 asks the server to re-scrape sources; cache:"no-store" guarantees fresh results.
export const fetchSourcesStatus =
  (refresh: boolean) =>
  ({ signal }: QueryCtx): Promise<SourcesStatusPayload> =>
    apiFetch<SourcesStatusPayload>(refresh ? `${apiPaths.sourcesStatus}?refresh=1` : apiPaths.sourcesStatus, signal, {
      cache: "no-store",
    });

export const qSourcesStatus = createApiQuery<SourcesStatusPayload>(queryKeys.sourcesStatus, apiPaths.sourcesStatus, {
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
export const useSuspenseOpenSourceModels = qOpenSourceModels.useSuspense;
export const useSuspenseOpenSourceReleases = qOpenSourceReleases.useSuspense;
export const useNewsByCategory = (category: NewsCategory) => qNews(category).use();

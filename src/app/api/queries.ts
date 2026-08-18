import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type {
  ArtificialAnalysisModel,
  NewsItem,
  NewsCategory,
  OpenSourceModelEntry,
  OpenRouterRankingsPayload,
  HomeDashboardData,
} from "@/shared/types";
import { FIVE_MINUTES, THIRTY_MINUTES } from "@/shared/config";
import { apiPaths, fetcher } from "@/app/api/client";

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
const qOpenSourceSearch = createApiQuery<OpenSourceModelEntry[]>(
  ["api", "open-source-models", "search"],
  apiPaths.openSourceModels("trendingScore", "-1", 20),
  {
    staleTime: FIVE_MINUTES,
  },
);
const qNews = (category: NewsCategory) =>
  createApiQuery<NewsItem[]>(["api", "news", category], apiPaths.news(category), {
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
  });

export const useArtificialRankings = qArtificial.use;
export const useSuspenseArtificialRankings = qArtificial.useSuspense;
export const useSuspenseOpenSourceReleases = qOpenSourceReleases.useSuspense;
export const useSuspenseHomeDashboard = qHomeDashboard.useSuspense;
export const useOpenRouterRankings = qOpenRouter.use;
export const useSuspenseOpenRouterRankings = qOpenRouter.useSuspense;
export const useOpenSourceModels = qOpenSourceModels.use;
export const useOpenSourceSearchModels = qOpenSourceSearch.use;
export const useNewsByCategory = (category: NewsCategory) => qNews(category).use();

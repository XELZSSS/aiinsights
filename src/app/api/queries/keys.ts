export const queryKeys = {
  artificialIndex: ["api", "artificial-analysis-index"] as const,
  openSourceReleases: ["api", "open-source-releases"] as const,
  openRouterRankings: ["api", "openrouter-rankings"] as const,
  homeDashboard: ["api", "home-dashboard"] as const,
  openSourceModels: ["api", "open-source-models"] as const,
  sourcesStatus: ["api", "sources-status"] as const,
  news: (category: string) => ["api", "news", category] as const,
};

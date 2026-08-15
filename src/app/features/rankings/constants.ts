export const RANKING_TABS = ["modelRankings", "openRouterRankings", "openSourceRankings", "hallucinationRankings", "tts", "providerCompare"] as const;

export type RankingTabId = (typeof RANKING_TABS)[number];

export const RANKING_TAB_INDEX: Record<RankingTabId, number> = {
  modelRankings: 0,
  openRouterRankings: 1,
  openSourceRankings: 2,
  hallucinationRankings: 3,
  tts: 4,
  providerCompare: 5,
};

import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { useSearchResetOnNavigate } from "./hooks";
import { RANKING_TAB_INDEX } from "./features/rankings/constants";

const HomeView = lazy(() => import("./features/home/HomeView").then((m) => ({ default: m.HomeView })));
const RankingsHubView = lazy(() => import("./features/rankings/RankingsHubView").then((m) => ({ default: m.RankingsHubView })));
const ReleasesView = lazy(() => import("./features/releases/ReleasesView").then((m) => ({ default: m.ReleasesView })));
const StatusView = lazy(() => import("./features/system").then((m) => ({ default: m.StatusView })));
const CompareView = lazy(() => import("./features/compare/CompareView").then((m) => ({ default: m.CompareView })));
const PriceCompareView = lazy(() => import("./features/compare/PriceCompareView").then((m) => ({ default: m.PriceCompareView })));
const NewsView = lazy(() => import("./features/news/NewsView").then((m) => ({ default: m.NewsView })));
const ModelDetailView = lazy(() => import("./features/models/ModelDetailView").then((m) => ({ default: m.ModelDetailView })));
const NotFound = lazy(() => import("./features/system").then((m) => ({ default: m.NotFound })));

export function AppRoutes() {
  useSearchResetOnNavigate();

  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/models" element={<RankingsHubView key="models" defaultTab={0} />} />
      <Route path="/releases" element={<ReleasesView key="releases" defaultMode="feed" />} />
      <Route path="/news" element={<NewsView />} />
      <Route path="/score-release" element={<ReleasesView key="score-release" defaultMode="release-dates" lockedMode />} />
      <Route path="/status" element={<StatusView />} />
      <Route path="/hallucinations" element={<RankingsHubView key="hallucinations" defaultTab={RANKING_TAB_INDEX.hallucinationRankings} />} />
      <Route path="/tts" element={<RankingsHubView key="tts" defaultTab={RANKING_TAB_INDEX.tts} />} />
      <Route path="/open-source" element={<RankingsHubView key="open-source" defaultTab={RANKING_TAB_INDEX.openSourceRankings} />} />
      <Route path="/compare" element={<CompareView />} />
      <Route path="/price-compare" element={<PriceCompareView />} />
      <Route path="/model/:source/*" element={<ModelDetailView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

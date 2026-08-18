import { lazy } from "react";
import { Route, Routes } from "react-router";
import { useSearchResetOnNavigate } from "@/app/hooks";
import { NotFound } from "@/app/components/shared";

const HomeView = lazy(() => import("./features/home/HomeView").then((m) => ({ default: m.HomeView })));
const RankingsHubView = lazy(() =>
  import("./features/rankings/RankingsHubView").then((m) => ({ default: m.RankingsHubView })),
);
const ReleasesView = lazy(() => import("./features/releases/ReleasesView").then((m) => ({ default: m.ReleasesView })));
const CompareView = lazy(() => import("./features/compare").then((m) => ({ default: m.CompareView })));
const PriceCompareView = lazy(() => import("./features/compare").then((m) => ({ default: m.PriceCompareView })));
const NewsView = lazy(() => import("./features/news/NewsView").then((m) => ({ default: m.NewsView })));
const ModelDetailView = lazy(() =>
  import("./features/models/ModelDetailView").then((m) => ({ default: m.ModelDetailView })),
);

export function AppRoutes() {
  useSearchResetOnNavigate();

  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/models" element={<RankingsHubView key="models" defaultTab={0} />} />
      <Route path="/releases" element={<ReleasesView key="releases" />} />
      <Route path="/news" element={<NewsView />} />
      <Route path="/compare" element={<CompareView />} />
      <Route path="/price-compare" element={<PriceCompareView />} />
      <Route path="/model/:source/*" element={<ModelDetailView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

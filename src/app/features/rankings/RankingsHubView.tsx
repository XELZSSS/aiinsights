import { lazy, memo, Suspense, useMemo, useState } from "react";

import { useTranslation } from "../../i18n";
import { useDocumentTitle } from "../../hooks";
import type { TranslationKey } from "../../../shared/i18n";
import { useArtificialRankings, useHallucinationRankings, useOpenSourceModels, useOpenRouterRankings } from "../../api/queries";
import { SuspenseQuery, Spinner } from "../../components/feedback/SuspenseQuery";
import { ArtificialAnalysisView } from "./ArtificialAnalysisView";
import { TabContainer, type TabItem } from "../../components/composite";
import { PageContainer, PageHeader } from "../../components/layout";
import { SearchInput } from "../home/SearchInput";

const HallucinationRankingsView = lazy(() => import("./HallucinationRankingsView").then((m) => ({ default: m.HallucinationRankingsView })));
const OpenSourceRankingsView = lazy(() => import("./OpenSourceRankingsView").then((m) => ({ default: m.OpenSourceRankingsView })));
const OpenRouterRankingsView = lazy(() => import("./OpenRouterRankingsView").then((m) => ({ default: m.OpenRouterRankingsView })));
const TtsView = lazy(() => import("./TtsView").then((m) => ({ default: m.TtsView })));
const ProviderCompareView = lazy(() => import("../compare/ProviderCompareView").then((m) => ({ default: m.ProviderCompareView })));

import { RANKING_TABS, type RankingTabId } from "./constants";

const TAB_SOURCE_LABEL: Record<RankingTabId, TranslationKey> = {
  modelRankings: "artificialSource",
  openRouterRankings: "openRouterSource",
  openSourceRankings: "openSourceDataSource",
  hallucinationRankings: "hallucinationSource",
  tts: "ttsSource",
  providerCompare: "artificialSource",
};

interface RankingsHubProps {
  defaultTab?: number;
}

// Only the model/hallucination/provider tabs need the (large) AA index; the
// TTS and Open Source tabs are served by dedicated lighter endpoints. Keeping
// each tab's query inside its own component leaves /tts and /open-source
// tabs free of the ~1MB AA payload.
const TabPanel = memo(function TabPanel({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
});

function ModelRankingsTab() {
  const aaQ = useArtificialRankings();
  return aaQ.data ? (
    <TabPanel>
      <ArtificialAnalysisView rankings={aaQ.data} />
    </TabPanel>
  ) : (
    <Spinner />
  );
}

function OpenRouterTab() {
  const orQ = useOpenRouterRankings();
  return orQ.data ? (
    <TabPanel>
      <OpenRouterRankingsView data={orQ.data} />
    </TabPanel>
  ) : (
    <Spinner />
  );
}

function OpenSourceTab() {
  const openSourceQ = useOpenSourceModels();
  return openSourceQ.data ? (
    <TabPanel>
      <OpenSourceRankingsView rankings={openSourceQ.data} />
    </TabPanel>
  ) : (
    <Spinner />
  );
}

function HallucinationRankingsTab() {
  const aaQ = useArtificialRankings();
  const hallucinationRankings = useHallucinationRankings(aaQ.data ?? []);
  return aaQ.isPending ? (
    <Spinner />
  ) : (
    <TabPanel>
      <HallucinationRankingsView rankings={hallucinationRankings} />
    </TabPanel>
  );
}

function TtsTab() {
  return (
    <TabPanel>
      <TtsView />
    </TabPanel>
  );
}

function ProviderCompareTab() {
  const aaQ = useArtificialRankings();
  return aaQ.data ? (
    <TabPanel>
      <ProviderCompareView data={aaQ.data} />
    </TabPanel>
  ) : (
    <Spinner />
  );
}

function ActiveTabContent({ activeTabId }: { activeTabId: RankingTabId }) {
  switch (activeTabId) {
    case "modelRankings":
      return <ModelRankingsTab />;
    case "openRouterRankings":
      return <OpenRouterTab />;
    case "openSourceRankings":
      return <OpenSourceTab />;
    case "hallucinationRankings":
      return <HallucinationRankingsTab />;
    case "tts":
      return <TtsTab />;
    case "providerCompare":
      return <ProviderCompareTab />;
    default:
      return null;
  }
}

function RankingsContent({ defaultTab }: { defaultTab: number }) {
  const { t } = useTranslation();
  const [activeTabId, setActiveTabId] = useState<RankingTabId>(() => RANKING_TABS[defaultTab] ?? RANKING_TABS[0]);

  const tabs: TabItem[] = useMemo(() => RANKING_TABS.map((id) => ({ id, label: t(id as TranslationKey) })), [t]);

  return (
    <PageContainer>
      <PageHeader title={t(activeTabId as TranslationKey)} description={t(TAB_SOURCE_LABEL[activeTabId])} actions={<SearchInput />} />
      <TabContainer tabs={tabs} activeTab={activeTabId} tabSize="md" onTabChange={(tabId) => setActiveTabId(tabId as RankingTabId)}>
        <ActiveTabContent activeTabId={activeTabId} />
      </TabContainer>
    </PageContainer>
  );
}

export function RankingsHubView({ defaultTab = 0 }: RankingsHubProps) {
  const { t } = useTranslation();
  useDocumentTitle(t("modelRankings"));
  return (
    <SuspenseQuery>
      <RankingsContent defaultTab={defaultTab} />
    </SuspenseQuery>
  );
}

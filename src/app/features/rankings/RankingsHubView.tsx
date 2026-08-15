import { lazy, memo, Suspense, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n";
import type { TranslationKey } from "@/shared/i18n";
import {
  useArtificialRankings,
  useHallucinationRankings,
  useOpenSourceModels,
  useOpenRouterRankings,
} from "@/app/api/queries";
import { SuspenseQuery, Spinner, SearchInput } from "@/app/components/shared";
import { ArtificialAnalysisView } from "@/app/features/rankings/ArtificialAnalysisView";
import { TabContainer, type TabItem } from "@/app/components/composite";
import { PageContainer, PageHeader } from "@/app/components/layout";
import { DataTable, type DataTableColumn } from "@/app/components/data";
import { Dot } from "@/app/components/ui";
import { formatScore, formatPricePerMillion, computeProviderStats, type ProviderStats } from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";
import {
  RANKING_TABS,
  TtsView,
  OpenSourceRankingsView,
  HallucinationRankingsView,
  type RankingTabId,
} from "@/app/features/rankings/RankingViews";

const OpenRouterRankingsView = lazy(() =>
  import("./OpenRouterRankingsView").then((m) => ({ default: m.OpenRouterRankingsView })),
);

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

const getProviderRowId = (p: ProviderStats) => p.name;

function ProviderCompareContent({ data }: { data: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();

  const providerStats = useMemo(() => computeProviderStats(data), [data]);

  const columns = useMemo<DataTableColumn<ProviderStats>[]>(
    () => [
      {
        id: "name",
        cell: (p) => (
          <div className="flex items-center gap-2">
            <Dot color={p.color} />
            <span className="font-medium text-sm">{p.name}</span>
          </div>
        ),
      },
      { id: "count", align: "right", cell: (p) => <span className="font-medium">{p.count}</span> },
      {
        id: "avgIntelligence",
        align: "right",
        cell: (p) => formatScore(t, p.avgIntelligence),
      },
      {
        id: "avgPrice",
        align: "right",
        hiddenMd: true,
        cell: (p) => formatPricePerMillion(p.avgPrice, t),
      },
      {
        id: "avgSpeed",
        align: "right",
        hiddenMd: true,
        cell: (p) => (p.avgSpeed != null ? `${p.avgSpeed.toFixed(1)} ${t("tokensPerSecond")}` : t("notAvailable")),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">{t("artificialSource")}</p>
      <DataTable columns={columns} data={providerStats} getRowId={getProviderRowId} />
    </div>
  );
}

function ProviderCompareTab() {
  const aaQ = useArtificialRankings();
  return aaQ.data ? (
    <TabPanel>
      <ProviderCompareContent data={aaQ.data} />
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
      <PageHeader
        title={t(activeTabId as TranslationKey)}
        description={t(TAB_SOURCE_LABEL[activeTabId])}
        actions={<SearchInput />}
      />
      <TabContainer
        tabs={tabs}
        activeTab={activeTabId}
        tabSize="md"
        onTabChange={(tabId) => setActiveTabId(tabId as RankingTabId)}
      >
        <ActiveTabContent activeTabId={activeTabId} />
      </TabContainer>
    </PageContainer>
  );
}

export function RankingsHubView({ defaultTab = 0 }: RankingsHubProps) {
  return (
    <SuspenseQuery>
      <RankingsContent defaultTab={defaultTab} />
    </SuspenseQuery>
  );
}
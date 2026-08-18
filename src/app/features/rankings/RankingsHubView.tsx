import { lazy, Suspense, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n";
import type { TranslationKey } from "@/shared/i18n";
import { useArtificialRankings, useOpenSourceModels, useOpenRouterRankings } from "@/app/api/queries";
import { useHallucinationRankings } from "@/app/domain/hallucination";
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
  OpenSourceRankingsView,
  HallucinationRankingsView,
  type RankingTabId,
} from "@/app/features/rankings/RankingViews";
import { MODEL_SOURCES } from "@/shared/config";

const OpenRouterRankingsView = lazy(() =>
  import("./OpenRouterRankingsView").then((m) => ({ default: m.OpenRouterRankingsView })),
);

const TAB_SOURCE_LABEL: Record<RankingTabId, TranslationKey> = {
  modelRankings: MODEL_SOURCES.aa.sourceLabelKey,
  openRouterRankings: MODEL_SOURCES.or.sourceLabelKey,
  openSourceRankings: MODEL_SOURCES.os.sourceLabelKey,
  hallucinationRankings: MODEL_SOURCES.hall.sourceLabelKey,
  providerCompare: MODEL_SOURCES.aa.sourceLabelKey,
};

interface RankingsHubProps {
  defaultTab?: number;
}

function ModelRankingsTab() {
  const aaQ = useArtificialRankings();
  return aaQ.data ? (
    <Suspense fallback={<Spinner />}>
      <ArtificialAnalysisView rankings={aaQ.data} />
    </Suspense>
  ) : (
    <Spinner />
  );
}

function OpenRouterTab() {
  const orQ = useOpenRouterRankings();
  return orQ.data ? (
    <Suspense fallback={<Spinner />}>
      <OpenRouterRankingsView data={orQ.data} />
    </Suspense>
  ) : (
    <Spinner />
  );
}

function OpenSourceTab() {
  const openSourceQ = useOpenSourceModels();
  return openSourceQ.data ? (
    <Suspense fallback={<Spinner />}>
      <OpenSourceRankingsView rankings={openSourceQ.data} />
    </Suspense>
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
    <Suspense fallback={<Spinner />}>
      <HallucinationRankingsView rankings={hallucinationRankings} />
    </Suspense>
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
        header: t("provider"),
        cell: (p) => (
          <div className="flex items-center gap-2 min-w-0">
            <Dot color={p.color} />
            <span className="font-medium text-sm truncate min-w-0">{p.name}</span>
          </div>
        ),
      },
      { id: "count", header: t("modelCount"), align: "right", cell: (p) => <span className="font-medium">{p.count}</span> },
      {
        id: "avgIntelligence",
        header: t("avgIntelligence"),
        align: "right",
        cell: (p) => formatScore(t, p.avgIntelligence),
      },
      {
        id: "avgPrice",
        header: t("avgPrice"),
        align: "right",
        hiddenMd: true,
        cell: (p) => formatPricePerMillion(p.avgPrice, t),
      },
      {
        id: "avgSpeed",
        header: t("avgSpeed"),
        align: "right",
        hiddenMd: true,
        cell: (p) => (p.avgSpeed != null ? `${p.avgSpeed.toFixed(1)} ${t("tokensPerSecond")}` : t("notAvailable")),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable columns={columns} data={providerStats} getRowId={getProviderRowId} />
    </div>
  );
}

function ProviderCompareTab() {
  const aaQ = useArtificialRankings();
  return aaQ.data ? (
    <Suspense fallback={<Spinner />}>
      <ProviderCompareContent data={aaQ.data} />
    </Suspense>
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

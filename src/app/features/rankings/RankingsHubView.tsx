import { lazy, Suspense, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n";
import type { TranslationKey } from "@/shared/i18n";
import {
  useSuspenseArtificialRankings,
  useSuspenseOpenSourceModels,
  useSuspenseOpenRouterRankings,
} from "@/app/api/queries";
import { useSuspenseHallucinationRankings } from "@/app/domain/hallucination";
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

// Each tab reports its data source label (Artificial Analysis / OpenRouter / Hugging Face).
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
  const { data } = useSuspenseArtificialRankings();
  return <ArtificialAnalysisView rankings={data} />;
}

function OpenRouterTab() {
  const { data } = useSuspenseOpenRouterRankings();
  return (
    <Suspense fallback={<Spinner />}>
      <OpenRouterRankingsView data={data} />
    </Suspense>
  );
}

function OpenSourceTab() {
  const { data } = useSuspenseOpenSourceModels();
  return <OpenSourceRankingsView rankings={data} />;
}

function HallucinationRankingsTab() {
  const hallucinationRankings = useSuspenseHallucinationRankings();
  return <HallucinationRankingsView rankings={hallucinationRankings} />;
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
      {
        id: "count",
        header: t("modelCount"),
        align: "right",
        cell: (p) => <span className="font-medium">{p.count}</span>,
      },
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
      <DataTable columns={columns} data={providerStats} getRowId={getProviderRowId} pageSize={8} />
    </div>
  );
}

function ProviderCompareTab() {
  const { data } = useSuspenseArtificialRankings();
  return <ProviderCompareContent data={data} />;
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
  // Fall back to the first tab when an out-of-range defaultTab is requested.
  const [activeTabId, setActiveTabId] = useState<RankingTabId>(() => RANKING_TABS[defaultTab] ?? RANKING_TABS[0]);

  const tabs: TabItem[] = useMemo(() => RANKING_TABS.map((id) => ({ id, label: t(id as TranslationKey) })), [t]);

  return (
    <PageContainer className="pt-3 sm:pt-4">
      <PageHeader
        compact
        title={t(activeTabId as TranslationKey)}
        description={t(TAB_SOURCE_LABEL[activeTabId])}
        actions={<SearchInput />}
      />
      <TabContainer
        tabs={tabs}
        activeTab={activeTabId}
        tabSize="md"
        className="gap-3 sm:gap-4"
        onTabChange={(tabId) => setActiveTabId(tabId as RankingTabId)}
      >
        <ActiveTabContent activeTabId={activeTabId} />
      </TabContainer>
    </PageContainer>
  );
}

/**
 * Rankings hub with tabs for model rankings, OpenRouter usage, open-source models,
 * hallucination benchmarks and provider comparison.
 */
export function RankingsHubView({ defaultTab = 0 }: RankingsHubProps) {
  return (
    <SuspenseQuery>
      <RankingsContent defaultTab={defaultTab} />
    </SuspenseQuery>
  );
}

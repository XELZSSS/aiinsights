import { memo, useMemo, lazy, Suspense } from "react";
import { Rocket, Image, BarChart3, Lightbulb } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useSuspenseArtificialRankings, useSuspenseHomeDashboard } from "@/app/api/queries";
import { useHallucinationRankings } from "@/app/domain/hallucination";
import { SuspenseQuery } from "@/app/components/shared";
import { StatCard, CardGrid } from "@/app/components/composite";
import { Card, CardContent, Dot } from "@/app/components/ui";
import { PageContainer, PageSection } from "@/app/components/layout";
import { getModelColor, groupByProvider, formatShortNumber } from "@/shared/utils";
import type { ArenaModel, ArtificialAnalysisModel, HallucinationRankingEntry, HomeDashboardData } from "@/shared/types";
import type { TranslationKey } from "@/shared/i18n";

import { SearchInput } from "@/app/components/shared";

interface HomeKpi {
  label: string;
  value: string;
  Icon: typeof Rocket;
}

interface HomeProviderStat {
  name: string;
  color: string;
  avgSpeed: number;
  count: number;
}

export interface HomeBarStat {
  label: string;
  value: number;
  valueLabel: string;
}

/** Renders the ELO rating as a "point (lower–upper)" confidence interval when present. */
function formatRatingInterval(entry: ArenaModel): string {
  if (entry.ratingUpper == null || entry.ratingLower == null) return "";
  return ` (${entry.ratingLower.toFixed(0)}–${entry.ratingUpper.toFixed(0)})`;
}

function useHomeDashboardData(
  artificialData: ArtificialAnalysisModel[],
  hallucinationRankings: HallucinationRankingEntry[],
  dashboardData: HomeDashboardData,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  // Aggregate the various datasets into the shapes the dashboard sections consume.
  return useMemo(() => {
    const openSourceRankings = dashboardData.opensource ?? [];
    const arenaT2IModels = dashboardData.arena?.models ?? [];
    const latestOpenRouterModel = dashboardData.orRankings?.tokenUsageRankings?.[0] ?? null;

    // Use the last path segment of the Hugging Face id (the repo name) for display.
    const downloadStats: HomeBarStat[] = openSourceRankings.slice(0, 7).map((model) => ({
      label: model.id.split("/").pop() || model.id,
      value: model.downloads,
      valueLabel: formatShortNumber(model.downloads),
    }));

    // Chart only models with a measured accuracy; others have no comparable value.
    const hallucinationStats: HomeBarStat[] = hallucinationRankings
      .filter((entry) => entry.accuracy != null)
      .slice(0, 7)
      .map((entry) => ({
        label: entry.model,
        value: entry.accuracy ?? 0,
        valueLabel: `${entry.accuracy?.toFixed(1)}%`,
      }));

    // Pick the most recent release across the Artificial Analysis dataset.
    const latestRelease = artificialData.reduce(
      (best, m) => {
        if (!m.release_date) return best;
        if (!best?.release_date) return m;
        return m.release_date > best.release_date ? m : best;
      },
      null as ArtificialAnalysisModel | null,
    );

    // -Infinity sentinel keeps models without an intelligence index from ever winning.
    const bestReasoningModel = artificialData.reduce(
      (best, m) => {
        if (m.is_reasoning !== true) return best;
        if (!best) return m;
        return (m.intelligence_index ?? -Infinity) > (best.intelligence_index ?? -Infinity) ? m : best;
      },
      null as ArtificialAnalysisModel | null,
    );

    const kpiStrip: HomeKpi[] = [
      { label: t("openRouterRankings"), value: latestOpenRouterModel?.name || t("notAvailable"), Icon: BarChart3 },
      { label: t("bestT2IModel"), value: arenaT2IModels[0]?.model || t("notAvailable"), Icon: Image },
      {
        label: t("latestRelease"),
        value: latestRelease?.short_name || latestRelease?.name || t("notAvailable"),
        Icon: Rocket,
      },
      {
        label: t("bestReasoningModel"),
        value: bestReasoningModel?.short_name || bestReasoningModel?.name || t("notAvailable"),
        Icon: Lightbulb,
      },
    ];

    const providers = groupByProvider(artificialData);
    const providerStats: HomeProviderStat[] = providers
      .map(({ name, color, models }) => {
        const speeds = models.map((m) => m.speed?.median_output_speed).filter((s): s is number => s != null);
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        return { name, color, avgSpeed, count: models.length };
      })
      // Order providers by average output speed so the fastest lead the card.
      .sort((a, b) => b.avgSpeed - a.avgSpeed);

    return { downloadStats, hallucinationStats, kpiStrip, providerStats, arenaT2IModels };
  }, [artificialData, hallucinationRankings, dashboardData, t]);
}

const IndexLineChart = lazy(() => import("./charts").then((m) => ({ default: m.IndexLineChart })));
const StatisticsSection = lazy(() => import("./charts").then((m) => ({ default: m.StatisticsSection })));

const KpiStrip = memo(function KpiStrip({ kpis }: { kpis: HomeKpi[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => (
        <StatCard key={kpi.label} icon={kpi.Icon} label={kpi.label} value={kpi.value} />
      ))}
    </div>
  );
});

const ProviderSpeedCard = memo(function ProviderSpeedCard({ providerStats }: { providerStats: HomeProviderStat[] }) {
  const { t } = useTranslation();
  return (
    <Card accent="top" className="h-full">
      <CardContent padding="md" className="flex flex-col h-full">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t("providerSpeed")}</p>
        <div className="flex flex-col gap-3 flex-1 justify-between">
          {providerStats.slice(0, 6).map((p) => (
            <div key={p.name} className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Dot color={p.color} />
                <span className="text-sm sm:text-base font-medium truncate">{p.name}</span>
              </div>
              <span className="text-sm sm:text-base font-semibold font-mono ml-3 shrink-0">
                {p.avgSpeed.toFixed(1)} {t("tokensPerSecond")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const ArenaT2ICard = memo(function ArenaT2ICard({
  entry,
  rank,
  color,
}: {
  entry: ArenaModel;
  rank: number;
  color: string;
}) {
  const { t } = useTranslation();
  return (
    <Card accent="left">
      <div className="flex flex-col gap-2.5 p-4 w-full">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold truncate">{entry.model}</span>
            {entry.modelOrganization && (
              <span className="text-xs text-text-secondary truncate shrink-0">({entry.modelOrganization})</span>
            )}
          </div>
          <span
            className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
          >
            #{rank}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span>
            ELO:{" "}
            <strong className="text-text-primary font-semibold" style={{ color }}>
              {entry.rating != null ? `${entry.rating.toFixed(0)}${formatRatingInterval(entry)}` : t("notAvailable")}
            </strong>
          </span>
          <span>
            {t("votes")}:{" "}
            <strong className="text-text-primary font-semibold">
              {entry.votes != null ? entry.votes.toLocaleString() : t("notAvailable")}
            </strong>
          </span>
          <span>
            {t("license")}:{" "}
            <strong className="text-text-primary font-semibold">{entry.license || t("notAvailable")}</strong>
          </span>
        </div>
      </div>
    </Card>
  );
});

const ArenaT2ISection = memo(function ArenaT2ISection({ models }: { models: ArenaModel[] }) {
  const { t } = useTranslation();
  if (models.length === 0) return null;
  return (
    <PageSection title={t("textToImage")} description={t("arenaAISource")}>
      <CardGrid cols={4} gap={3}>
        {models.slice(0, 8).map((entry, index) => (
          <ArenaT2ICard key={entry.model} entry={entry} rank={index + 1} color={getModelColor(index)} />
        ))}
      </CardGrid>
    </PageSection>
  );
});

const HomeContent = memo(function HomeContent() {
  const { t } = useTranslation();

  const { data: artificialData } = useSuspenseArtificialRankings();
  const hallucinationRankings = useHallucinationRankings(artificialData);
  const { data: dashboardData } = useSuspenseHomeDashboard();

  const { downloadStats, hallucinationStats, kpiStrip, providerStats, arenaT2IModels } = useHomeDashboardData(
    artificialData,
    hallucinationRankings,
    dashboardData,
    t,
  );

  return (
    <PageContainer>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="w-full sm:w-auto sm:ml-auto">
          <SearchInput />
        </div>
      </div>

      <div className="mb-6">
        <KpiStrip kpis={kpiStrip} />
      </div>

      <PageSection>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Suspense
              fallback={
                <Card accent="top">
                  <CardContent padding="md">
                    <p className="text-sm font-semibold mb-3">{t("intelligenceIndex")} — Top 10</p>
                    <div className="h-[210px] sm:h-[260px] animate-pulse bg-bg-secondary rounded-lg" />
                  </CardContent>
                </Card>
              }
            >
              <IndexLineChart models={artificialData} />
            </Suspense>
          </div>
          <ProviderSpeedCard providerStats={providerStats} />
        </div>
      </PageSection>

      <Suspense fallback={null}>
        <StatisticsSection downloadStats={downloadStats} hallucinationStats={hallucinationStats} />
      </Suspense>

      <ArenaT2ISection models={arenaT2IModels} />
    </PageContainer>
  );
});

/**
 * Landing page dashboard: KPI strip, intelligence-index chart, provider speeds,
 * download/hallucination stats and text-to-image arena highlights.
 */
export function HomeView() {
  return (
    <SuspenseQuery>
      <HomeContent />
    </SuspenseQuery>
  );
}

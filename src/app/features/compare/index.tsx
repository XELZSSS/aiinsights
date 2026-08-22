import { memo, useMemo } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, TrendingDown } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card, CardContent } from "@/app/components/ui";
import { BackButton } from "@/app/components/shared";
import { CompareChipBar } from "./CompareChipBar";
import { Spinner } from "@/app/components/shared";
import { CompareTable, type CompareRow } from "./CompareTable";

import { useTranslation } from "@/app/i18n";
import { useElementWidth } from "@/app/hooks";
import { useCompareModels } from "./useCompareModels";
import { useCompareStore } from "@/app/stores";
import { useArtificialRankings } from "@/app/api/queries";
import {
  modelId,
  cn,
  chartTooltipStyle,
  getModelColor,
  buildCompareMetrics,
  buildRadarData,
  type CompareMetric,
} from "@/shared/utils";
import type { TranslationKey } from "@/shared/i18n";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { buildPriceRows, PriceTable, PriceChart, CostEstimator } from "@/app/features/compare/pricing";
import { PageContainer, PageHeader } from "@/app/components/layout";

/**
 * Resolves the compared model ids into full model objects via the rankings query,
 * returning null while the query is still loading.
 */
function useComparedModelsOrNull(): ArtificialAnalysisModel[] | null {
  const rankingsQ = useArtificialRankings();
  const models = useCompareModels(rankingsQ.data ?? []);
  return useMemo(() => {
    if (rankingsQ.isPending || !rankingsQ.data) return null;
    return models;
  }, [rankingsQ.isPending, rankingsQ.data, models]);
}

interface ComparePageLayoutProps {
  backLabelKey: TranslationKey;
  backTo: string;
  backState?: Record<string, unknown>;
  title: string;
  children: (models: ArtificialAnalysisModel[]) => React.ReactNode;
}

function ComparePageLayout({ backLabelKey, backTo, backState, title, children }: ComparePageLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const removeCompareModel = useCompareStore((s) => s.removeCompareModel);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const models = useComparedModelsOrNull();

  if (models === null) return <Spinner />;

  if (models.length < 2) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 items-center py-16">
          <p className="text-sm text-text-secondary">{t("compareNeedsTwo")}</p>
          <Button size="sm" variant="outline" onClick={() => navigate(backTo)}>
            {t("backToList")}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pt-3 sm:pt-4">
      <div className="flex flex-col gap-4 min-w-0">
        <BackButton labelKey={backLabelKey} to={backTo} state={backState} />
        <PageHeader compact title={title} description={t("artificialSource")} />
        <CompareChipBar
          models={models}
          onRemove={removeCompareModel}
          onClear={() => {
            clearCompare();
            navigate(backTo);
          }}
        />
        {children(models)}
      </div>
    </PageContainer>
  );
}

// Translate each metric's "higher is better" flag into the table's best/worst
// markers so every column highlights the appropriate extreme.
function metricToRow(metric: CompareMetric): CompareRow<ArtificialAnalysisModel> {
  const best = metric.higherIsBetter === undefined ? undefined : metric.higherIsBetter ? "max" : "min";
  const worst = metric.higherIsBetter === undefined ? undefined : metric.higherIsBetter ? "min" : "max";
  return {
    label: metric.label,
    getValue: metric.getValue,
    getNumeric: metric.getNumericValue,
    bestIs: best,
    worstIs: worst,
  };
}

const MetricValueDisplay = memo(function MetricValueDisplay({
  value,
  winner,
  iconSize = 12,
  className = "",
}: {
  value: string;
  winner: "win" | "loss" | null;
  iconSize?: number;
  className?: string;
}) {
  const winnerColor = winner === "win" ? "var(--success)" : winner === "loss" ? "var(--destructive)" : undefined;

  return (
    <span
      className={cn("font-mono tabular-nums", winner === "win" && "font-semibold", className)}
      style={winnerColor ? { color: winnerColor } : undefined}
    >
      {value}
      {winner === "win" && <TrendingUp size={iconSize} className="inline ml-0.5" style={{ color: "var(--success)" }} />}
      {winner === "loss" && (
        <TrendingDown size={iconSize} className="inline ml-0.5" style={{ color: "var(--destructive)" }} />
      )}
    </span>
  );
});

const MetricCompareTable = memo(function MetricCompareTable({
  metrics,
  models,
}: {
  metrics: CompareMetric[];
  models: ArtificialAnalysisModel[];
}) {
  const rows = useMemo(() => metrics.map(metricToRow), [metrics]);
  return (
    <CompareTable
      rows={rows}
      models={models}
      getKey={(m) => modelId(m)}
      getName={(m) => m.short_name || m.name}
      getColor={getModelColor}
      mobileCard
      renderValue={(row, model, winner) => <MetricValueDisplay value={row.getValue?.(model) ?? ""} winner={winner} />}
    />
  );
});

function CompareContent({ models }: { models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();
  const metrics = useMemo(() => buildCompareMetrics(t), [t]);
  const radarData = useMemo(() => buildRadarData(t, models), [models, t]);

  return (
    <Card>
      <CardContent padding="md">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:items-stretch">
          <div className="min-w-0 w-full md:w-1/2 flex items-center justify-center">
            <div className="w-full h-[240px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="78%" margin={{ top: 24, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                  {/* dataKey `model_${index}` matches the series keys produced by buildRadarData */}
                  {models.map((model, index) => (
                    <Radar
                      key={modelId(model) || index}
                      name={model.short_name || model.name}
                      dataKey={`model_${index}`}
                      stroke={getModelColor(index)}
                      fill={getModelColor(index)}
                      fillOpacity={0.06}
                      isAnimationActive={false}
                    />
                  ))}
                  <Tooltip contentStyle={chartTooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="min-w-0 w-full md:w-1/2 md:flex md:items-center">
            <MetricCompareTable metrics={metrics} models={models} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Side-by-side model comparison with a radar chart and per-metric best/worst highlighting. */
export function CompareView() {
  const { t } = useTranslation();

  return (
    <ComparePageLayout backLabelKey="backToModelRankings" backTo="/models" title={t("modelComparison")}>
      {(models) => <CompareContent models={models} />}
    </ComparePageLayout>
  );
}

const PriceCompareContent = memo(function PriceCompareContent({
  models,
  chartRef,
  chartWidth,
}: {
  models: ArtificialAnalysisModel[];
  chartRef: React.RefObject<HTMLDivElement | null>;
  chartWidth: number;
}) {
  const { t } = useTranslation();

  const priceRows = useMemo(() => buildPriceRows(t), [t]);

  return (
    <>
      <Card accent="top">
        <CardContent padding="md">
          <p className="text-sm font-semibold mb-3">{t("priceBreakdown")}</p>
          <PriceTable priceRows={priceRows} models={models} />
        </CardContent>
      </Card>

      <PriceChart priceRows={priceRows} models={models} chartRef={chartRef} chartWidth={chartWidth} />

      <CostEstimator models={models} />
    </>
  );
});

/** Price-focused comparison: pricing table, per-row bar chart and a monthly cost estimator. */
export function PriceCompareView() {
  const { t } = useTranslation();
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();

  return (
    <ComparePageLayout
      backLabelKey="backToPricing"
      backTo="/models"
      backState={{ viewMode: "pricing" }}
      title={t("priceComparison")}
    >
      {(models) => <PriceCompareContent models={models} chartRef={chartRef} chartWidth={chartWidth} />}
    </ComparePageLayout>
  );
}

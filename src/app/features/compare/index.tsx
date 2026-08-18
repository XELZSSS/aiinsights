import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card, CardContent, Th, Td, Tr } from "@/app/components/ui";
import { BackButton, CompareChipBar } from "@/app/components/composite";
import { Spinner } from "@/app/components/shared";

import { useTranslation } from "@/app/i18n";
import { useElementWidth, useIsMobile } from "@/app/hooks";
import { useCompareStore } from "@/app/stores";
import { useArtificialRankings } from "@/app/api/queries";
import {
  modelId,
  cn,
  chartTooltipStyle,
  getModelColor,
  buildCompareMetrics,
  buildRadarData,
  approxEq,
  type CompareMetric,
} from "@/shared/utils";
import type { TranslationKey } from "@/shared/i18n";import type { ArtificialAnalysisModel } from "@/shared/types";
import {
  buildPriceRows,
  getBestPrice,
  PriceTable,
  PriceChart,
  CostEstimator,
} from "@/app/features/compare/pricing";import { PageContainer, PageHeader } from "@/app/components/layout";

function useCompareModels(): ArtificialAnalysisModel[] | null {
  const compareIds = useCompareStore((s) => s.compareIds);
  const rankingsQ = useArtificialRankings();
  return useMemo(() => {
    if (rankingsQ.isPending || !rankingsQ.data) return null;
    return compareIds
      .map((id) => rankingsQ.data.find((m) => modelId(m) === id))
      .filter((m): m is ArtificialAnalysisModel => !!m);
  }, [compareIds, rankingsQ.data, rankingsQ.isPending]);
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
  const models = useCompareModels();

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
    <PageContainer>
      <div className="flex flex-col gap-5 min-w-0">
        <BackButton labelKey={backLabelKey} to={backTo} state={backState} />
        <PageHeader title={title} description={t("artificialSource")} />
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

function computeMetricWinners(metric: CompareMetric, models: ArtificialAnalysisModel[]): Map<string, "win" | "loss"> {
  const values = models
    .map((m) => ({ id: modelId(m), val: metric.getNumericValue?.(m) }))
    .filter((v): v is { id: string; val: number } => typeof v.val === "number" && Number.isFinite(v.val));
  if (values.length < 2) return new Map();
  const best =
    metric.higherIsBetter === false ? Math.min(...values.map((v) => v.val)) : Math.max(...values.map((v) => v.val));
  const worst =
    metric.higherIsBetter === false ? Math.max(...values.map((v) => v.val)) : Math.min(...values.map((v) => v.val));
  const map = new Map<string, "win" | "loss">();
  for (const { id, val } of values) {
    if (approxEq(val, best)) map.set(id, "win");
    else if (approxEq(val, worst)) map.set(id, "loss");
  }
  return map;
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

interface ModelMetricRowProps {
  model: ArtificialAnalysisModel;
  index: number;
  metric: CompareMetric;
  winners: Map<string, "win" | "loss">;
  iconSize?: number;
  className?: string;
}

const ModelMetricRow = memo(function ModelMetricRow({
  model,
  index,
  metric,
  winners,
  iconSize = 12,
  className = "",
}: ModelMetricRowProps) {
  const winner = winners.get(modelId(model)) ?? null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs truncate" style={{ color: getModelColor(index) }}>
        {model.short_name || model.name}
      </span>
      <MetricValueDisplay value={metric.getValue(model)} winner={winner} iconSize={iconSize} className={className} />
    </div>
  );
});

const CompactMetricCards = memo(function CompactMetricCards({
  metrics,
  models,
}: {
  metrics: CompareMetric[];
  models: ArtificialAnalysisModel[];
}) {
  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      {metrics.map((metric) => {
        const winners = computeMetricWinners(metric, models);
        return (
          <Card key={metric.label} accent="top">
            <CardContent padding="sm">
              <p className="text-xs font-semibold text-text-secondary mb-2">{metric.label}</p>
              <div className="flex flex-col gap-1.5">
                {models.map((model, index) => (
                  <ModelMetricRow
                    key={modelId(model) || index}
                    model={model}
                    index={index}
                    metric={metric}
                    winners={winners}
                    iconSize={10}
                    className="text-xs font-mono"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

const MetricTable = memo(function MetricTable({
  metrics,
  models,
}: {
  metrics: CompareMetric[];
  models: ArtificialAnalysisModel[];
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <Th className="px-3 py-2.5 font-semibold text-text-secondary">{t("metric")}</Th>
            {models.map((model, index) => (
              <Th
                key={modelId(model) || index}
                align="right"
                className="px-3 py-2.5 font-semibold"
                style={{ color: getModelColor(index) }}
              >
                {model.short_name || model.name}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const winners = computeMetricWinners(metric, models);
            return (
              <Tr key={metric.label} className="hover:bg-hover transition-colors">
                <Td className="px-3 py-2.5 text-text-secondary">{metric.label}</Td>
                {models.map((model, index) => (
                  <Td key={modelId(model) || index} align="right" className="px-3 py-2.5">
                    <MetricValueDisplay
                      value={metric.getValue(model)}
                      winner={winners.get(modelId(model)) ?? null}
                      iconSize={12}
                    />
                  </Td>
                ))}
              </Tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

function CompareContent({ models }: { models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const metrics = useMemo(() => buildCompareMetrics(t), [t]);
  const radarData = useMemo(() => buildRadarData(t, models), [models, t]);

  return (
    <Card>
      <CardContent padding="lg">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:items-stretch">
          <div className="min-w-0 w-full md:w-1/2 flex items-center justify-center">
            <div className="w-full h-[340px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="78%" margin={{ top: 24, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
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
            {isMobile ? (
              <CompactMetricCards metrics={metrics} models={models} />
            ) : (
              <MetricTable metrics={metrics} models={models} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const bestPrices = useMemo(() => getBestPrice(priceRows, models), [priceRows, models]);

  return (
    <>
      <Card accent="top">
        <CardContent padding="md">
          <p className="text-sm font-semibold mb-3">{t("priceBreakdown")}</p>
          <PriceTable priceRows={priceRows} models={models} bestPrices={bestPrices} />
        </CardContent>
      </Card>

      <PriceChart priceRows={priceRows} models={models} chartRef={chartRef} chartWidth={chartWidth} />

      <CostEstimator models={models} />
    </>
  );
});

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

import { memo, useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Tooltip } from "recharts";
import { Card, CardContent } from "../../components/ui";
import { chartTooltipStyle } from "../../../shared/utils/format";
import { cn } from "../../../shared/utils";
import { useTranslation } from "../../i18n";
import { useDocumentTitle } from "../../hooks";
import { buildCompareMetrics, buildRadarData } from "../../../shared/utils";
import { useElementWidth } from "../../hooks";
import { getModelColor } from "../../../shared/utils";
import { modelId } from "../../../shared/utils";
import type { ArtificialAnalysisModel } from "../../../shared/types";
import type { CompareMetric } from "../../../shared/utils";
import { approxEq } from "../../../shared/utils";
import { useIsMobile } from "../../hooks";
import { ComparePageLayout } from "./ComparePageLayout";

function computeMetricWinners(metric: CompareMetric, models: ArtificialAnalysisModel[]): Map<string, "win" | "loss"> {
  const values = models
    .map((m) => ({ id: modelId(m), val: metric.getNumericValue?.(m) }))
    .filter((v): v is { id: string; val: number } => typeof v.val === "number" && Number.isFinite(v.val));
  if (values.length < 2) return new Map();
  const best = metric.higherIsBetter === false ? Math.min(...values.map((v) => v.val)) : Math.max(...values.map((v) => v.val));
  const worst = metric.higherIsBetter === false ? Math.max(...values.map((v) => v.val)) : Math.min(...values.map((v) => v.val));
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
    <span className={cn("font-mono tabular-nums", winner === "win" && "font-semibold", className)} style={winnerColor ? { color: winnerColor } : undefined}>
      {value}
      {winner === "win" && <TrendingUp size={iconSize} className="inline ml-0.5" style={{ color: "var(--success)" }} />}
      {winner === "loss" && <TrendingDown size={iconSize} className="inline ml-0.5" style={{ color: "var(--destructive)" }} />}
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

const ModelMetricRow = memo(function ModelMetricRow({ model, index, metric, winners, iconSize = 12, className = "" }: ModelMetricRowProps) {
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

const CompactMetricCards = memo(function CompactMetricCards({ metrics, models }: { metrics: CompareMetric[]; models: ArtificialAnalysisModel[] }) {
  return (
    <div className="flex flex-col gap-3">
      {metrics.map((metric) => {
        const winners = computeMetricWinners(metric, models);
        return (
          <Card key={metric.label} accent="top">
            <CardContent padding="sm">
              <p className="text-xs font-semibold text-text-secondary mb-2">{metric.label}</p>
              <div className="flex flex-col gap-1.5">
                {models.map((model, index) => (
                  <ModelMetricRow key={modelId(model) || index} model={model} index={index} metric={metric} winners={winners} iconSize={10} className="text-xs font-mono" />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

const MetricTable = memo(function MetricTable({ metrics, models }: { metrics: CompareMetric[]; models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2.5 font-semibold text-text-secondary">{t("metric")}</th>
            {models.map((model, index) => (
              <th key={modelId(model) || index} className="text-right px-3 py-2.5 font-semibold" style={{ color: getModelColor(index) }}>
                {model.short_name || model.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const winners = computeMetricWinners(metric, models);
            return (
              <tr key={metric.label} className="border-b border-border last:border-b-0 hover:bg-hover transition-colors">
                <td className="px-3 py-2.5 text-text-secondary">{metric.label}</td>
                {models.map((model, index) => (
                  <td key={modelId(model) || index} className="px-3 py-2.5 text-right">
                    <MetricValueDisplay value={metric.getValue(model)} winner={winners.get(modelId(model)) ?? null} iconSize={12} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export function CompareView() {
  const { t } = useTranslation();
  useDocumentTitle(t("modelComparison"));
  const [radarRef, radarWidth] = useElementWidth<HTMLDivElement>();
  const radarSize = Math.max(100, Math.min(radarWidth - 16, 500));

  return (
    <ComparePageLayout backLabelKey="backToModelRankings" backTo="/models" title={t("modelComparison")}>
      {(models) => <CompareContent models={models} radarRef={radarRef} radarSize={radarSize} />}
    </ComparePageLayout>
  );
}

function CompareContent({ models, radarRef, radarSize }: { models: ArtificialAnalysisModel[]; radarRef: React.RefObject<HTMLDivElement | null>; radarSize: number }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const metrics = useMemo(() => buildCompareMetrics(t), [t]);
  const radarData = useMemo(() => buildRadarData(t, models), [models, t]);

  return (
    <Card>
      <CardContent padding="lg">
        <div className="flex flex-col md:flex-row gap-6 md:items-stretch">
          <div ref={radarRef} className="hidden md:flex min-w-0 w-full md:w-1/2 items-center justify-center">
            <RadarChart
              width={radarSize}
              height={340}
              data={radarData}
              outerRadius={Math.max(60, Math.min(140, radarSize / 2 - 24))}
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
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
          </div>
          <div className="min-w-0 w-full md:w-1/2 flex items-center">
            {isMobile ? <CompactMetricCards metrics={metrics.filter((m) => m.mobileKey)} models={models} /> : <MetricTable metrics={metrics} models={models} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

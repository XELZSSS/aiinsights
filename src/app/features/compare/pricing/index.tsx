import { memo, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, Input } from "@/app/components/ui";
import {
  chartTooltipStyle,
  formatDollar,
  cn,
  getModelColor,
  approxEq,
  modelInputPrice,
  modelOutputPrice,
  modelCacheHitPrice,
} from "@/shared/utils";
import { CompareTable, type CompareRow } from "@/app/components/data/compare-table";
import { useTranslation } from "@/app/i18n";
import { useMonthlyCosts } from "@/app/hooks";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { TFunction } from "@/shared/i18n";

export function buildPriceRows(t: TFunction): CompareRow<ArtificialAnalysisModel>[] {
  return [
    { label: t("promptPrice"), getNumeric: (m) => modelInputPrice(m), bestIs: "min" },
    { label: t("completionPrice"), getNumeric: (m) => modelOutputPrice(m), bestIs: "min" },
    { label: t("cacheHitPrice"), getNumeric: (m) => modelCacheHitPrice(m), bestIs: "min" },
  ];
}

const WinnerMark = memo(function WinnerMark() {
  return (
    <span className={cn("inline-flex items-center gap-0.5", "text-xs font-bold", "text-success ml-1")}>
      <TrendingUp size={10} />
    </span>
  );
});

function PriceValue({
  row,
  model,
  winner,
}: {
  row: CompareRow<ArtificialAnalysisModel>;
  model: ArtificialAnalysisModel;
  winner: "win" | "loss" | null;
}) {
  const { t } = useTranslation();
  const value = row.getNumeric?.(model);
  return typeof value === "number" ? (
    <span className={cn("font-mono", winner === "win" && "font-bold text-success")}>
      {formatDollar(value)}
      {winner === "win" && <WinnerMark />}
    </span>
  ) : (
    <span className="text-text-tertiary">{t("notAvailable")}</span>
  );
}

export const PriceTable = memo(function PriceTable({
  priceRows,
  models,
}: {
  priceRows: CompareRow<ArtificialAnalysisModel>[];
  models: ArtificialAnalysisModel[];
}) {
  return (
    <CompareTable
      rows={priceRows}
      models={models}
      getKey={(m) => m.id || m.slug}
      getName={(m) => m.short_name || m.name}
      getColor={getModelColor}
      mobileLayout="model-cards"
      renderValue={(row, model, winner) => <PriceValue row={row} model={model} winner={winner} />}
    />
  );
});

export const PriceChart = memo(function PriceChart({
  priceRows,
  models,
  chartRef,
  chartWidth,
}: {
  priceRows: CompareRow<ArtificialAnalysisModel>[];
  models: ArtificialAnalysisModel[];
  chartRef: React.RefObject<HTMLDivElement | null>;
  chartWidth: number;
}) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return priceRows.map((row) => {
      const entry: Record<string, string | number> = { name: row.label };
      models.forEach((model, index) => {
        const v = row.getNumeric?.(model);
        entry[`model_${index}`] = typeof v === "number" ? v : 0;
      });
      return entry;
    });
  }, [priceRows, models]);

  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">{t("priceComparison")}</p>
        <div ref={chartRef} className="w-full h-[220px] sm:h-[200px]">
          {chartWidth > 0 && (
            <BarChart
              width={chartWidth}
              height={185}
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-tertiary)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--text-tertiary)" tickFormatter={(v: number) => `$${v}`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]} />
              {models.map((model, index) => (
                <Bar
                  key={model.id ?? index}
                  dataKey={`model_${index}`}
                  name={model.short_name || model.name}
                  fill={getModelColor(index)}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const CostEstimator = memo(function CostEstimator({ models }: { models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();

  const {
    dailyInput,
    setDailyInput,
    dailyOutput,
    setDailyOutput,
    dailyReasoning,
    setDailyReasoning,
    cacheHitRate,
    setCacheHitRate,
    daysPerMonth,
    setDaysPerMonth,
    monthlyCosts,
  } = useMonthlyCosts(models);

  const bestMonthlyCost = useMemo(() => {
    const valid = monthlyCosts.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.min(...valid) : null;
  }, [monthlyCosts]);

  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">{t("estimatedMonthlyCost")}</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("dailyPromptTokens")}</label>
            <Input
              type="number"
              value={dailyInput}
              onChange={(e) => setDailyInput(e.target.value)}
              className="w-20 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">M</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("dailyCompletionTokens")}</label>
            <Input
              type="number"
              value={dailyOutput}
              onChange={(e) => setDailyOutput(e.target.value)}
              className="w-20 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">M</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("dailyReasoningTokens")}</label>
            <Input
              type="number"
              value={dailyReasoning}
              onChange={(e) => setDailyReasoning(e.target.value)}
              className="w-20 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">M</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("cacheHitRate")}</label>
            <Input
              type="number"
              value={cacheHitRate}
              onChange={(e) => setCacheHitRate(e.target.value)}
              className="w-20 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("daysPerMonth")}</label>
            <Input
              type="number"
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(e.target.value)}
              className="w-20 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {models.map((model, index) => {
            const cost = monthlyCosts[index];
            const isBest = cost != null && bestMonthlyCost != null && approxEq(cost, bestMonthlyCost);
            return (
              <div key={model.id ?? index} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate" style={{ color: getModelColor(index) }}>
                  {model.short_name || model.name}
                </span>
                {cost != null ? (
                  <span className={cn("font-mono text-sm", isBest && "font-semibold text-success")}>
                    {formatDollar(cost, t)}
                    {isBest && <WinnerMark />}
                  </span>
                ) : (
                  <span className="text-sm text-text-tertiary">{t("notAvailable")}</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

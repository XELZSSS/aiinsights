import { memo, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/app/components/ui";
import { CostEstimatorInputs } from "@/app/components/composite";
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

/** Price comparison rows for prompt/completion/cache-hit rates; lower is always better. */
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
      // Build one bar-series key per model (`model_${index}`) so each model
      // renders as its own bar; missing prices become 0 rather than dropping the series.
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

/** Interactive monthly-cost estimator that highlights the cheapest model. */
export const CostEstimator = memo(function CostEstimator({ models }: { models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();

  const { monthlyCosts, ...inputs } = useMonthlyCosts(models);

  // Cheapest model among valid monthly estimates; compared with approxEq below
  // because costs are derived floats and may not be bit-identical.
  const bestMonthlyCost = useMemo(() => {
    const valid = monthlyCosts.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.min(...valid) : null;
  }, [monthlyCosts]);

  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">{t("estimatedMonthlyCost")}</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4">
          <CostEstimatorInputs state={inputs} layout="label-input-unit" />
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

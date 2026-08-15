import { memo, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, Input, Th, Td, Tr } from "@/app/components/ui";
import { chartTooltipStyle, formatDollar, formatScore, cn, getModelColor, calcModelCost, approxEq } from "@/shared/utils";
import { useTranslation } from "@/app/i18n";
import { useIsMobile } from "@/app/hooks";
import { PRICING_BLENDS } from "@/shared/config";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { TFunction } from "@/shared/i18n";

export interface PriceRow {
  label: string;
  getValue: (m: ArtificialAnalysisModel) => number | null | undefined;
  format: (v: number) => string;
}

export function buildPriceRows(t: TFunction): PriceRow[] {
  return [
    { label: t("promptPrice"), getValue: (m) => m.pricing?.input, format: (v) => formatDollar(v) },
    { label: t("completionPrice"), getValue: (m) => m.pricing?.output, format: (v) => formatDollar(v) },
    { label: t("cacheHitPrice"), getValue: (m) => m.pricing?.cache_hit, format: (v) => formatDollar(v) },
    {
      label: t("blendedPrice"),
      getValue: (m) => m.pricing?.blended?.[PRICING_BLENDS.INPUT_7_OUTPUT_2_1],
      format: (v) => formatDollar(v),
    },
  ];
}

export function getBestPrice(rows: PriceRow[], models: ArtificialAnalysisModel[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const row of rows) {
    const values = models
      .map((m) => row.getValue(m))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length > 0) best.set(row.label, Math.min(...values));
  }
  return best;
}

export const WinnerMark = memo(function WinnerMark() {
  return (
    <span className={cn("inline-flex items-center gap-0.5", "text-xs font-bold", "text-success ml-1")}>
      <TrendingUp size={10} />
    </span>
  );
});

export const PriceValue = memo(function PriceValue({
  value,
  format,
  isBest,
}: {
  value: number | null | undefined;
  format: (v: number) => string;
  isBest: boolean;
}) {
  const { t } = useTranslation();
  return typeof value === "number" ? (
    <span className={cn("font-mono", isBest && "font-bold text-success")}>
      {format(value)}
      {isBest && <WinnerMark />}
    </span>
  ) : (
    <span className="text-text-tertiary">{t("notAvailable")}</span>
  );
});

function PriceTableDesktop({
  priceRows,
  models,
  bestPrices,
}: {
  priceRows: PriceRow[];
  models: ArtificialAnalysisModel[];
  bestPrices: Map<string, number>;
}) {
  const { t } = useTranslation();
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <Th className="text-text-secondary">{t("metric")}</Th>
            {models.map((model, index) => (
              <Th key={model.id ?? index} align="right" style={{ color: getModelColor(index) }}>
                {model.short_name || model.name}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {priceRows.map((row) => {
            const best = bestPrices.get(row.label);
            return (
              <Tr key={row.label}>
                <Td className="text-text-secondary">{row.label}</Td>
                {models.map((model, index) => {
                  const v = row.getValue(model);
                  return (
                    <Td key={model.id ?? index} align="right" mono>
                      <PriceValue
                        value={v}
                        format={row.format}
                        isBest={typeof v === "number" && best != null && approxEq(v, best)}
                      />
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PriceTableMobile({
  priceRows,
  models,
  bestPrices,
}: {
  priceRows: PriceRow[];
  models: ArtificialAnalysisModel[];
  bestPrices: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {priceRows.map((row) => {
        const best = bestPrices.get(row.label);
        return (
          <Card key={row.label}>
            <CardContent className="p-3">
              <p className="text-xs font-bold text-text-secondary mb-2">{row.label}</p>
              <div className="flex flex-col gap-1">
                {models.map((model, index) => {
                  const v = row.getValue(model);
                  return (
                    <div key={model.id ?? index} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate" style={{ color: getModelColor(index) }}>
                        {model.short_name || model.name}
                      </span>
                      <span className="text-xs">
                        <PriceValue
                          value={v}
                          format={row.format}
                          isBest={typeof v === "number" && best != null && approxEq(v, best)}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const PriceTable = memo(function PriceTable({
  priceRows,
  models,
  bestPrices,
}: {
  priceRows: PriceRow[];
  models: ArtificialAnalysisModel[];
  bestPrices: Map<string, number>;
}) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <PriceTableMobile priceRows={priceRows} models={models} bestPrices={bestPrices} />
  ) : (
    <PriceTableDesktop priceRows={priceRows} models={models} bestPrices={bestPrices} />
  );
});

function EfficiencyTableDesktop({
  models,
  costEfficiency,
  bestEfficiency,
}: {
  models: ArtificialAnalysisModel[];
  costEfficiency: (number | null)[];
  bestEfficiency: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <Th className="text-text-secondary">{t("modelNameOrId")}</Th>
            <Th align="right" className="text-text-secondary">
              {t("intelligenceIndex")}
            </Th>
            <Th align="right" className="text-text-secondary">
              {t("blendedPrice")}
            </Th>
            <Th align="right" className="text-text-secondary">
              {t("intelligencePerDollar")}
            </Th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, index) => {
            const eff = costEfficiency[index];
            const isBest = eff != null && bestEfficiency != null && approxEq(eff, bestEfficiency);
            return (
              <Tr key={model.id ?? index}>
                <Td style={{ color: getModelColor(index) }}>{model.short_name || model.name}</Td>
                <Td align="right" mono>
                  {formatScore(t, model.intelligence_index)}
                </Td>
                <Td align="right" mono>
                  {formatDollar(model.pricing?.blended?.[PRICING_BLENDS.INPUT_7_OUTPUT_2_1], t)}
                </Td>
                <Td align="right" mono>
                  {eff != null ? (
                    <span className={cn(isBest && "font-bold text-success")}>
                      {eff.toFixed(2)}
                      {isBest && <WinnerMark />}
                    </span>
                  ) : (
                    t("notAvailable")
                  )}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EfficiencyTableMobile({
  models,
  costEfficiency,
  bestEfficiency,
}: {
  models: ArtificialAnalysisModel[];
  costEfficiency: (number | null)[];
  bestEfficiency: number | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {models.map((model, index) => {
        const eff = costEfficiency[index];
        const isBest = eff != null && bestEfficiency != null && approxEq(eff, bestEfficiency);
        return (
          <Card key={model.id ?? index}>
            <CardContent className="p-3">
              <p className="text-xs font-bold mb-2" style={{ color: getModelColor(index) }}>
                {model.short_name || model.name}
              </p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{t("intelligenceIndex")}</span>
                  <span className="text-xs font-mono">{formatScore(t, model.intelligence_index)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{t("blendedPrice")}</span>
                  <span className="text-xs font-mono">
                    {formatDollar(model.pricing?.blended?.[PRICING_BLENDS.INPUT_7_OUTPUT_2_1], t)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{t("intelligencePerDollar")}</span>
                  <span className={cn("text-xs font-mono", isBest && "font-bold text-success")}>
                    {eff != null ? (
                      <>
                        {eff.toFixed(2)}
                        {isBest && <WinnerMark />}
                      </>
                    ) : (
                      t("notAvailable")
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const EfficiencyTable = memo(function EfficiencyTable({
  models,
  costEfficiency,
  bestEfficiency,
}: {
  models: ArtificialAnalysisModel[];
  costEfficiency: (number | null)[];
  bestEfficiency: number | null;
}) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <EfficiencyTableMobile models={models} costEfficiency={costEfficiency} bestEfficiency={bestEfficiency} />
  ) : (
    <EfficiencyTableDesktop models={models} costEfficiency={costEfficiency} bestEfficiency={bestEfficiency} />
  );
});

export const PriceChart = memo(function PriceChart({
  priceRows,
  models,
  chartRef,
  chartWidth,
}: {
  priceRows: PriceRow[];
  models: ArtificialAnalysisModel[];
  chartRef: React.RefObject<HTMLDivElement | null>;
  chartWidth: number;
}) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return priceRows.map((row) => {
      const entry: Record<string, string | number> = { name: row.label };
      models.forEach((model, index) => {
        const v = row.getValue(model);
        entry[`model_${index}`] = typeof v === "number" ? v : 0;
      });
      return entry;
    });
  }, [priceRows, models]);

  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">{t("priceComparison")}</p>
        <div ref={chartRef} className="w-full h-[220px]">
          {chartWidth > 0 && (
            <BarChart
              width={chartWidth}
              height={220}
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

  const [promptTokens, setPromptTokens] = useState("10");
  const [completionTokens, setCompletionTokens] = useState("5");

  const calcPrompt = Math.max(0, Number(promptTokens) || 0);
  const calcCompletion = Math.max(0, Number(completionTokens) || 0);

  const monthlyCosts = useMemo(() => {
    return models.map((model) => calcModelCost(model, calcPrompt * 1_000_000, calcCompletion * 1_000_000));
  }, [models, calcPrompt, calcCompletion]);

  const bestMonthlyCost = useMemo(() => {
    const valid = monthlyCosts.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.min(...valid) : null;
  }, [monthlyCosts]);

  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">{t("estimatedMonthlyCost")}</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("monthlyPromptTokens")}</label>
            <Input
              type="number"
              value={promptTokens}
              onChange={(e) => setPromptTokens(e.target.value)}
              className="w-24 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">M</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{t("monthlyCompletionTokens")}</label>
            <Input
              type="number"
              value={completionTokens}
              onChange={(e) => setCompletionTokens(e.target.value)}
              className="w-24 h-9 text-sm"
            />
            <span className="text-xs text-text-secondary">M</span>
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
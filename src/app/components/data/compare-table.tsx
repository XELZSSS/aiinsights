import { memo, type ReactNode } from "react";
import { useTranslation } from "@/app/i18n";
import { useDevice } from "@/app/device";
import { Card, CardContent, Dot, Td, Th, Tr } from "@/app/components/ui";
import { approxEq } from "@/shared/utils";

export interface CompareRow<T> {
  label: string;
  getValue?: (m: T) => string;
  getNumeric?: (m: T) => number | null | undefined;
  bestIs?: "max" | "min";
  worstIs?: "max" | "min";
}

export interface CompareTableProps<T> {
  rows: CompareRow<T>[];
  models: T[];
  getKey: (m: T, index: number) => string;
  getName: (m: T) => string;
  getColor: (index: number) => string;
  renderValue: (row: CompareRow<T>, model: T, winner: "win" | "loss" | null) => ReactNode;
  mobileLayout?: "metric-rows" | "model-cards";
  mobileCard?: boolean;
}

// For each numeric row, flag the model(s) with the best value as "win" and the worst as "loss".
// approxEq avoids marking near-ties as winners due to floating-point noise.
function computeWinners<T>(
  rows: CompareRow<T>[],
  models: T[],
  getKey: (m: T, index: number) => string,
): Map<string, Map<string, "win" | "loss">> {
  const winners = new Map<string, Map<string, "win" | "loss">>();
  for (const row of rows) {
    const accessor = row.getNumeric;
    if (!accessor || !row.bestIs) continue;
    const values = models
      .map((model, index) => ({ key: getKey(model, index), val: accessor(model) }))
      .filter((v): v is { key: string; val: number } => typeof v.val === "number" && Number.isFinite(v.val));
    if (values.length < 2) continue;
    const best = row.bestIs === "min" ? Math.min(...values.map((v) => v.val)) : Math.max(...values.map((v) => v.val));
    const perModel = new Map<string, "win" | "loss">();
    for (const v of values) if (approxEq(v.val, best)) perModel.set(v.key, "win");
    if (row.worstIs) {
      const worst =
        row.worstIs === "min" ? Math.min(...values.map((v) => v.val)) : Math.max(...values.map((v) => v.val));
      for (const v of values) {
        if (!perModel.has(v.key) && approxEq(v.val, worst)) perModel.set(v.key, "loss");
      }
    }
    winners.set(row.label, perModel);
  }
  return winners;
}

function DesktopTable<T>({
  rows,
  models,
  getKey,
  getName,
  getColor,
  renderValue,
  winners,
}: {
  rows: CompareRow<T>[];
  models: T[];
  getKey: (m: T, index: number) => string;
  getName: (m: T) => string;
  getColor: (index: number) => string;
  renderValue: (row: CompareRow<T>, model: T, winner: "win" | "loss" | null) => ReactNode;
  winners: Map<string, Map<string, "win" | "loss">>;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <Th className="px-3 py-2.5 font-semibold text-text-secondary sticky left-0 z-10 bg-bg-card">
              {t("metric")}
            </Th>
            {models.map((model, index) => (
              <Th
                key={getKey(model, index)}
                align="right"
                className="px-3 py-2.5 font-semibold"
                style={{ color: getColor(index) }}
              >
                {getName(model)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.label} className="hover:bg-hover transition-colors">
              <Td className="px-3 py-2.5 text-text-secondary sticky left-0 bg-bg-card z-10">{row.label}</Td>
              {models.map((model, index) => (
                <Td key={getKey(model, index)} align="right" className="px-3 py-2.5">
                  {renderValue(row, model, winners.get(row.label)?.get(getKey(model, index)) ?? null)}
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricRowsMobile<T>({
  rows,
  models,
  getKey,
  getColor,
  renderValue,
  winners,
}: {
  rows: CompareRow<T>[];
  models: T[];
  getKey: (m: T, index: number) => string;
  getColor: (index: number) => string;
  renderValue: (row: CompareRow<T>, model: T, winner: "win" | "loss" | null) => ReactNode;
  winners: Map<string, Map<string, "win" | "loss">>;
}) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const perModel = winners.get(row.label);
        return (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="text-xs font-medium text-text-secondary shrink-0">{row.label}</span>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              {models.map((model, index) => (
                <span key={getKey(model, index)} className="flex items-center gap-1">
                  <Dot size="sm" color={getColor(index)} />
                  {renderValue(row, model, perModel?.get(getKey(model, index)) ?? null)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelCardsMobile<T>({
  rows,
  models,
  getKey,
  getName,
  getColor,
  renderValue,
  winners,
}: {
  rows: CompareRow<T>[];
  models: T[];
  getKey: (m: T, index: number) => string;
  getName: (m: T) => string;
  getColor: (index: number) => string;
  renderValue: (row: CompareRow<T>, model: T, winner: "win" | "loss" | null) => ReactNode;
  winners: Map<string, Map<string, "win" | "loss">>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {models.map((model, index) => (
        <Card key={getKey(model, index)}>
          <CardContent className="p-3 flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium truncate" style={{ color: getColor(index) }}>
              <Dot size="sm" color={getColor(index)} />
              {getName(model)}
            </p>
            <div className="flex flex-col gap-1">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary">{row.label}</span>
                  {renderValue(row, model, winners.get(row.label)?.get(getKey(model, index)) ?? null)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CompareTableInner<T>({
  rows,
  models,
  getKey,
  getName,
  getColor,
  renderValue,
  mobileLayout = "metric-rows",
  mobileCard = false,
}: CompareTableProps<T>) {
  const { isMobile } = useDevice();
  const winners = computeWinners(rows, models, getKey);

  // On mobile, swap the table for a compact list: either per-metric rows or per-model cards.
  if (isMobile) {
    if (mobileLayout === "model-cards") {
      return (
        <ModelCardsMobile
          rows={rows}
          models={models}
          getKey={getKey}
          getName={getName}
          getColor={getColor}
          renderValue={renderValue}
          winners={winners}
        />
      );
    }
    const inner = (
      <MetricRowsMobile
        rows={rows}
        models={models}
        getKey={getKey}
        getColor={getColor}
        renderValue={renderValue}
        winners={winners}
      />
    );
    if (mobileCard) {
      return (
        <Card accent="top">
          <CardContent padding="sm">{inner}</CardContent>
        </Card>
      );
    }
    return inner;
  }

  return (
    <DesktopTable
      rows={rows}
      models={models}
      getKey={getKey}
      getName={getName}
      getColor={getColor}
      renderValue={renderValue}
      winners={winners}
    />
  );
}

/**
 * Comparison table that renders a horizontal desktop table or a mobile-friendly
 * metric-rows/model-cards layout, highlighting best/worst values per metric.
 */
export const CompareTable = memo(CompareTableInner) as typeof CompareTableInner;

import type { DataTableColumn } from "@/app/components/data";
import { RankingNameCell, RightAlignedText } from "@/app/components/data";
import { formatShortNumber, formatTrend, cn } from "@/shared/utils";
import type { OpenRouterRankEntry } from "@/shared/types";
import type { TranslationKey } from "@/shared/i18n";

// Neutral gray for no change; green for growth, red for decline (zero counts as neutral).
function trendClass(change?: number | null) {
  if (change == null || change === 0) return "bg-bg-tertiary text-text-secondary border-border";
  return change > 0
    ? "bg-success-soft text-success border-success/20"
    : "bg-destructive-soft text-destructive border-destructive/20";
}

// Factory for a right-aligned token-count column with monospace formatting.
const tokenColumn = <T,>(
  id: string,
  header: string,
  accessor: (item: T) => number | null | undefined,
): DataTableColumn<T> => ({
  id,
  header,
  align: "right",
  cell: (item) => (
    <span className="font-mono font-semibold text-text-primary">{formatShortNumber(accessor(item) || 0)}</span>
  ),
});

// Factory for a right-aligned request-count column, hidden on small screens.
const requestColumn = <T extends { requestCount?: number | null }>(header: string): DataTableColumn<T> => ({
  id: "requests",
  header,
  align: "right",
  hiddenMd: true,
  cell: (item) => <span className="font-mono text-text-secondary">{formatShortNumber(item.requestCount || 0)}</span>,
});

/** OpenRouter token-usage columns plus the request-count trend badge. */
export function buildOpenRouterColumns(t: (key: TranslationKey) => string): DataTableColumn<OpenRouterRankEntry>[] {
  return [
    {
      id: "model",
      header: t("model"),
      width: "45%",
      cell: (item) => <RankingNameCell name={item.name} />,
    },
    tokenColumn<OpenRouterRankEntry>("totalTokens", t("totalTokens"), (item) => item.totalTokens),
    tokenColumn<OpenRouterRankEntry>("inputTokens", t("inputTokens"), (item) => item.promptTokens),
    tokenColumn<OpenRouterRankEntry>("outputTokens", t("outputTokens"), (item) => item.completionTokens),
    requestColumn<OpenRouterRankEntry>(t("requests")),
    {
      id: "creator",
      header: t("creator"),
      align: "right",
      hiddenMd: true,
      cell: (item) => <RightAlignedText className="text-xs">{item.creator || t("unknown")}</RightAlignedText>,
    },
    {
      id: "trend",
      header: t("trend"),
      align: "right",
      hiddenMd: true,
      cell: (item) => (
        <span className={cn(trendClass(item.change), "border rounded text-xs py-0 px-1 font-mono inline-block")}>
          {formatTrend(item.change, t)}
        </span>
      ),
    },
  ];
}

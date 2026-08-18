import { Plus, Check } from "lucide-react";
import type { DataTableColumn } from "@/app/components/data";
import { TagBadge, Button } from "@/app/components/ui";
import { RightAlignedText, ModelDetailContent, RankingNameCell } from "@/app/components/composite";
import { formatScore, formatDollar, formatShortNumber, formatTokens, formatTrend } from "@/shared/utils";
import { cn } from "@/shared/utils";
import type { ArtificialAnalysisModel, OpenRouterRankEntry } from "@/shared/types";
import type { TFunction, TranslationKey } from "@/shared/i18n";
import { useTranslation } from "@/app/i18n";
import { useCompareStore } from "@/app/stores";

function useIsCompared(model: ArtificialAnalysisModel): boolean {
  return useCompareStore((s) => s.compareIds.includes(model.id || model.slug));
}

function CompareButton({ model }: { model: ArtificialAnalysisModel }) {
  const isCompared = useIsCompared(model);
  const toggleCompareModel = useCompareStore((s) => s.toggleCompareModel);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        toggleCompareModel(model);
      }}
      className="shrink-0"
    >
      {isCompared ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
    </Button>
  );
}

export function ModelExpandedDetail({ model }: { model: ArtificialAnalysisModel }) {
  return (
    <div className="p-4 sm:p-5">
      <ModelDetailContent model={model} showBenchmarks={false} />
    </div>
  );
}

function RankingModelCell({ model }: { model: ArtificialAnalysisModel }) {
  const { t } = useTranslation();
  const metricItems: [string, string][] = [
    [t("intelligenceIndex"), formatScore(t, model.intelligence_index)],
    [t("coding"), formatScore(t, model.coding_index)],
    [t("agentic"), formatScore(t, model.agentic_index)],
  ];
  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm font-semibold truncate flex-1 min-w-0">{model.name}</p>
        <CompareButton model={model} />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0 mt-1 md:hidden">
        {metricItems.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs text-text-secondary shrink-0">{label}</span>
            <span className="text-xs font-semibold truncate">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-1 md:hidden">
        {model.model_creators?.name && <TagBadge>{model.model_creators.name}</TagBadge>}
      </div>
    </>
  );
}

interface PricedModel {
  model: ArtificialAnalysisModel;
  monthlyCost: number | null;
}

function priceCell(get: (m: PricedModel) => number | null | undefined, t: TFunction) {
  return (m: PricedModel) => formatDollar(get(m), t);
}

function scoreColumn(
  id: string,
  header: string,
  accessor: (m: ArtificialAnalysisModel) => number | null | undefined,
  t: TFunction,
): DataTableColumn<ArtificialAnalysisModel> {
  return {
    id,
    header,
    align: "right",
    hiddenMd: true,
    cell: (model) => formatScore(t, accessor(model)),
  };
}

export function buildRankingColumns(t: TFunction): DataTableColumn<ArtificialAnalysisModel>[] {
  return [
    {
      id: "model",
      header: t("model"),
      width: "40%",
      cell: (model) => <RankingModelCell model={model} />,
    },
    {
      id: "creator",
      header: t("creator"),
      hiddenMd: true,
      align: "right",
      cell: (model) => <RightAlignedText>{model.model_creators?.name || t("notAvailable")}</RightAlignedText>,
    },
    scoreColumn("intelligence", t("intelligenceIndex"), (m) => m.intelligence_index, t),
    scoreColumn("coding", t("coding"), (m) => m.coding_index, t),
    scoreColumn("agentic", t("agentic"), (m) => m.agentic_index, t),
    {
      id: "context",
      header: t("contextWindow"),
      align: "right",
      hiddenMd: true,
      cell: (model) => formatTokens(model.context_window_tokens, t),
    },
  ];
}

export function buildPricingColumns(t: TFunction): DataTableColumn<PricedModel>[] {
  return [
    {
      id: "model",
      header: t("model"),
      width: "35%",
      cell: (row) => (
        <>
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-sm truncate flex-1 min-w-0">{row.model.name || row.model.slug}</p>
            <CompareButton model={row.model} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1 md:hidden">
            {row.model.model_creators?.name && <TagBadge>{row.model.model_creators.name}</TagBadge>}
            {row.model.pricing?.cache_hit != null && (
              <TagBadge>
                {t("cacheHitPrice")}: {formatDollar(row.model.pricing.cache_hit, t)}
              </TagBadge>
            )}
            {row.model.blended_price != null && (
              <TagBadge>
                {t("blendedPrice")}: {formatDollar(row.model.blended_price, t)}
              </TagBadge>
            )}
            <TagBadge>
              {t("monthlyCost")}: {formatDollar(row.monthlyCost, t)}
            </TagBadge>
          </div>
        </>
      ),
    },
    {
      id: "provider",
      header: t("provider"),
      align: "right",
      hiddenMd: true,
      cell: (row) => <RightAlignedText>{row.model.model_creators?.name || t("notAvailable")}</RightAlignedText>,
    },
    {
      id: "cacheHitPrice",
      header: t("cacheHitPrice"),
      align: "right",
      hiddenMd: true,
      cell: priceCell((m) => m.model.pricing?.cache_hit, t),
    },
    {
      id: "blendedPrice",
      header: t("blendedPrice"),
      align: "right",
      hiddenMd: true,
      cell: priceCell((m) => m.model.blended_price, t),
    },
    {
      id: "promptPrice",
      header: t("promptPrice"),
      align: "right",
      cell: priceCell((m) => m.model.pricing?.input, t),
    },
    {
      id: "completionPrice",
      header: t("completionPrice"),
      align: "right",
      cell: priceCell((m) => m.model.pricing?.output, t),
    },
    {
      id: "monthlyCost",
      header: t("monthlyCost"),
      align: "right",
      hiddenMd: true,
      cell: (row) => formatDollar(row.monthlyCost, t),
    },
  ];
}

function trendClass(change?: number | null) {
  if (change == null || change === 0) return "bg-bg-tertiary text-text-secondary border-border";
  return change > 0
    ? "bg-success/10 text-success border-success/20"
    : "bg-destructive/10 text-destructive border-destructive/20";
}

const tokenColumn = <T extends { totalTokens?: number | null }>(header: string): DataTableColumn<T> => ({
  id: "tokens",
  header,
  align: "right",
  cell: (item) => (
    <span className="font-mono font-semibold text-text-primary">{formatShortNumber(item.totalTokens || 0)}</span>
  ),
});

const requestColumn = <T extends { requestCount?: number | null }>(header: string): DataTableColumn<T> => ({
  id: "requests",
  header,
  align: "right",
  hiddenMd: true,
  cell: (item) => <span className="font-mono text-text-secondary">{formatShortNumber(item.requestCount || 0)}</span>,
});

const imageColumn = <T extends { imageOutputRequests?: number | null }>(header: string): DataTableColumn<T> => ({
  id: "images",
  header,
  align: "right",
  hiddenMd: true,
  cell: (item) => (
    <span className="font-mono text-text-secondary">{formatShortNumber(item.imageOutputRequests || 0)}</span>
  ),
});

const videoColumn = <T extends { videoOutputSeconds?: number | null }>(header: string): DataTableColumn<T> => ({
  id: "video",
  header,
  align: "right",
  hiddenMd: true,
  cell: (item) => (
    <span className="font-mono text-text-secondary">{formatShortNumber(item.videoOutputSeconds || 0)}</span>
  ),
});

export function buildOpenRouterColumns(t: (key: TranslationKey) => string): DataTableColumn<OpenRouterRankEntry>[] {
  return [
    {
      id: "model",
      header: t("model"),
      width: "45%",
      cell: (item) => (
        <>
          <RankingNameCell name={item.name} />
          <div className="flex flex-wrap gap-1 mt-1 md:hidden">
            <TagBadge>
              {t("requests")}: {formatShortNumber(item.requestCount || 0)}
            </TagBadge>
            {item.imageOutputRequests ? (
              <TagBadge>
                {t("images")}: {formatShortNumber(item.imageOutputRequests)}
              </TagBadge>
            ) : null}
            {item.videoOutputSeconds ? (
              <TagBadge>
                {t("videoSeconds")}: {formatShortNumber(item.videoOutputSeconds)}
              </TagBadge>
            ) : null}
            {item.creator && <TagBadge>{item.creator}</TagBadge>}
            <TagBadge className={item.change != null ? trendClass(item.change) : undefined}>
              {formatTrend(item.change, t)}
            </TagBadge>
          </div>
        </>
      ),
    },
    tokenColumn<OpenRouterRankEntry>(t("totalTokens")),
    requestColumn<OpenRouterRankEntry>(t("requests")),
    imageColumn<OpenRouterRankEntry>(t("images")),
    videoColumn<OpenRouterRankEntry>(t("videoSeconds")),
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

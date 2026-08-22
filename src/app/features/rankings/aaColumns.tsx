import { Lightbulb, Plus, Check } from "lucide-react";
import type { DataTableColumn } from "@/app/components/data";
import { Button } from "@/app/components/ui";
import { RightAlignedText } from "@/app/components/data";
import { ModelDetailContent } from "@/app/features/models/ModelDetailContent";
import {
  formatScore,
  formatDollar,
  formatTokens,
  modelInputPrice,
  modelOutputPrice,
  modelCacheHitPrice,
  modelId,
} from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { TFunction } from "@/shared/i18n";
import { useTranslation } from "@/app/i18n";
import { useCompareStore } from "@/app/stores";

function ReasoningBadge({ label }: { label: string }) {
  return <Lightbulb className="size-3.5 shrink-0 text-warning" aria-label={label} />;
}

function useIsCompared(model: ArtificialAnalysisModel): boolean {
  return useCompareStore((s) => s.compareIds.includes(modelId(model)));
}

function CompareButton({ model }: { model: ArtificialAnalysisModel }) {
  const isCompared = useIsCompared(model);
  const toggleCompareModel = useCompareStore((s) => s.toggleCompareModel);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        // Prevent the click from toggling the row's expand/collapse state.
        e.stopPropagation();
        toggleCompareModel(model);
      }}
      className="shrink-0 -my-2"
    >
      {isCompared ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
    </Button>
  );
}

/** Expanded row body showing the full model detail card. */
export function ModelExpandedDetail({ model }: { model: ArtificialAnalysisModel }) {
  return (
    <div className="p-4 sm:p-5">
      <ModelDetailContent model={model} showBenchmarks={false} />
    </div>
  );
}

function RankingModelCell({ model }: { model: ArtificialAnalysisModel }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 min-w-0">
      {model.is_reasoning === true && <ReasoningBadge label={t("reasoning")} />}
      <p className="text-sm font-semibold truncate flex-1 min-w-0">{model.name}</p>
      <CompareButton model={model} />
    </div>
  );
}

interface PricedModel {
  model: ArtificialAnalysisModel;
  monthlyCost: number | null;
}

function priceCell(get: (m: PricedModel) => number | null | undefined, t: TFunction) {
  return (m: PricedModel) => formatDollar(get(m), t);
}

// Factory for a right-aligned score column that hides on small screens.
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

/** Ranking table columns: scores, reasoning time and context window. */
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
    {
      ...scoreColumn("intelligence", t("intelligenceIndex"), (m) => m.intelligence_index, t),
      // Intelligence is the headline metric, so it stays visible (and primary) on mobile.
      mobilePrimary: true,
    },
    scoreColumn("coding", t("coding"), (m) => m.coding_index, t),
    scoreColumn("agentic", t("agentic"), (m) => m.agentic_index, t),
    {
      id: "reasoningTime",
      header: t("reasoningTime"),
      align: "right",
      hiddenMd: true,
      cell: (model) =>
        model.reasoning_time_seconds != null ? (
          <RightAlignedText>{`${model.reasoning_time_seconds.toFixed(1)}s`}</RightAlignedText>
        ) : (
          <RightAlignedText className="text-text-tertiary">{t("notAvailable")}</RightAlignedText>
        ),
    },
    {
      id: "context",
      header: t("contextWindow"),
      align: "right",
      hiddenMd: true,
      cell: (model) => formatTokens(model.context_window_tokens, t),
    },
  ];
}

/** Pricing table columns: cache/prompt/completion prices and estimated monthly cost. */
export function buildPricingColumns(t: TFunction): DataTableColumn<PricedModel>[] {
  return [
    {
      id: "model",
      header: t("model"),
      width: "35%",
      cell: (row) => (
        <div className="flex items-center gap-1 min-w-0">
          {row.model.is_reasoning === true && <ReasoningBadge label={t("reasoning")} />}
          <p className="text-sm truncate flex-1 min-w-0">{row.model.name || row.model.slug}</p>
          <CompareButton model={row.model} />
        </div>
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
      cell: priceCell((m) => modelCacheHitPrice(m.model), t),
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
      cell: priceCell((m) => modelInputPrice(m.model), t),
    },
    {
      id: "completionPrice",
      header: t("completionPrice"),
      align: "right",
      cell: priceCell((m) => modelOutputPrice(m.model), t),
    },
    {
      id: "monthlyCost",
      header: t("monthlyCost"),
      align: "right",
      hiddenMd: true,
      mobilePrimary: true,
      cell: (row) => formatDollar(row.monthlyCost, t),
    },
  ];
}

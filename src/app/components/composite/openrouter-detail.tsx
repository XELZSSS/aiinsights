import { useTranslation } from "@/app/i18n";
import { Badge } from "@/app/components/ui";
import type { OpenRouterRankEntry } from "@/shared/types";
import {
  categoryLabel,
  formatPricePerMillion,
  formatShortNumber,
  formatTrend,
  getModelRecommendation,
  openRouterCompletionPrice,
  openRouterPromptPrice,
} from "@/shared/utils";
import { DetailLayout, StatGrid, InfoGrid } from "./layout";
import { InfoCard, InfoRow } from "./info-card";
import { StatCard } from "./stat-card";

// Prices are stored per token; convert to per-million-token for display consistency.
function toPerMillion(price: number | null | undefined): number | undefined {
  return typeof price === "number" && Number.isFinite(price) ? price * 1_000_000 : undefined;
}

/** Detail view for an OpenRouter ranking entry: stats, pricing, recommendation and badges. */
export function OpenRouterModelDetail({ model }: { model: OpenRouterRankEntry }) {
  const { t } = useTranslation();
  // Only surface meaningful variants; "standard"/"free" are the defaults and add noise.
  const showVariantBadge = !!model.variant && model.variant !== "standard" && model.variant !== "free";
  return (
    <DetailLayout>
      <StatGrid columns={4}>
        <StatCard label={t("creator")} value={model.creator} />
        <StatCard label={t("inputTokens")} value={formatShortNumber(model.promptTokens ?? 0)} />
        <StatCard label={t("outputTokens")} value={formatShortNumber(model.completionTokens ?? 0)} />
        {model.reasoningTokens ? (
          <StatCard label={t("reasoningTokens")} value={formatShortNumber(model.reasoningTokens)} />
        ) : (
          <StatCard label={t("category")} value={categoryLabel(model.category, t)} />
        )}
      </StatGrid>
      <InfoGrid>
        <InfoCard title={t("modelInfo")}>
          <InfoRow
            compact
            label={t("apiModelId")}
            value={<code className="font-mono text-xs bg-bg-secondary px-1 rounded">{model.id}</code>}
          />
          <InfoRow compact label={t("category")} value={categoryLabel(model.category, t)} />
          <InfoRow compact label={t("trend")} value={formatTrend(model.change, t)} />
          <InfoRow compact label={t("totalTokens")} value={formatShortNumber(model.totalTokens ?? 0)} />
        </InfoCard>
        <InfoCard title={t("pricing")}>
          <InfoRow compact label={t("promptPrice")} value={formatPricePerMillion(toPerMillion(openRouterPromptPrice(model)), t)} />
          <InfoRow compact label={t("completionPrice")} value={formatPricePerMillion(toPerMillion(openRouterCompletionPrice(model)), t)} />
        </InfoCard>
      </InfoGrid>
      <InfoCard title={t("techSelectionAdvice")}>
        <p className="text-xs text-text-secondary leading-relaxed">{getModelRecommendation(model.id, t)}</p>
      </InfoCard>
      {(showVariantBadge || model.isFree) && (
        <div className="flex flex-wrap gap-1.5">
          {showVariantBadge && <Badge variant="outline">{model.variant}</Badge>}
          {model.isFree && (
            <Badge variant="outline" className="text-success">
              {t("free")}
            </Badge>
          )}
        </div>
      )}
    </DetailLayout>
  );
}
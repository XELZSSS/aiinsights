import { useTranslation } from "@/app/i18n";
import { Badge } from "@/app/components/ui";
import type { OpenRouterRankEntry } from "@/shared/types";
import {
  categoryLabel,
  formatDollar,
  formatShortNumber,
  formatTrend,
  getModelRecommendation,
  openRouterCompletionPrice,
  openRouterPromptPrice,
} from "@/shared/utils";
import { DetailLayout, StatGrid, InfoGrid } from "./layout";
import { InfoCard, InfoRow } from "./info-card";
import { StatCard } from "./stat-card";

export function OpenRouterModelDetail({ model }: { model: OpenRouterRankEntry }) {
  const { t } = useTranslation();
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
          <InfoRow compact label={t("promptPrice")} value={formatDollar(openRouterPromptPrice(model), t)} />
          <InfoRow compact label={t("completionPrice")} value={formatDollar(openRouterCompletionPrice(model), t)} />
        </InfoCard>
      </InfoGrid>
      <InfoCard title={t("techSelectionAdvice")}>
        <p className="text-xs text-text-secondary leading-relaxed">{getModelRecommendation(model.id, t)}</p>
      </InfoCard>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{model.variant || model.category}</Badge>
        {model.isFree && (
          <Badge variant="outline" className="text-success">
            {t("free")}
          </Badge>
        )}
      </div>
    </DetailLayout>
  );
}
import { StatCard, InfoCard, InfoRow, ModelDetailContent, DetailLayout, StatGrid, InfoGrid } from "../../../components/composite";
import { Badge } from "../../../components/ui";
import { useTranslation } from "../../../i18n";
import { useSuspenseArtificialRankings, useHallucinationRankings, useSuspenseOpenRouterRankings } from "../../../api/queries";
import { findModel } from "../../../../shared/utils";
import { formatShortNumber, formatTrend, formatDollar, formatDate, categoryLabel, orNA } from "../../../../shared/utils/format";
import { getRecommendation } from "../../../../shared/config";
import { NotFound } from "../../system";
import type { HallucinationRankingEntry, ArtificialAnalysisModel, OpenRouterRankEntry, OpenSourceModelEntry, TtsModel } from "../../../../shared/types";

function HallDetailContent({ model, aaModel }: { model: HallucinationRankingEntry; aaModel?: ArtificialAnalysisModel }) {
  const { t } = useTranslation();
  return (
    <DetailLayout>
      <StatGrid columns={4}>
        <StatCard label={t("omniscienceIndex")} value={model.omniscienceIndex.toFixed(1)} />
        <StatCard label={t("accuracy")} value={`${model.accuracy.toFixed(1)}%`} />
        <StatCard label={t("hallucinationRate")} value={`${model.hallucinationRate.toFixed(1)}%`} />
        <StatCard label={t("attemptRate")} value={`${model.attemptRate.toFixed(1)}%`} />
      </StatGrid>
      <InfoCard title={t("modelInfo")}>
        <InfoRow compact label={t("modelNameOrId")} value={model.model} />
        <InfoRow compact label={t("slug")} value={model.slug} />
        {aaModel?.model_creators?.name && <InfoRow compact label={t("creator")} value={aaModel.model_creators.name} />}
        {aaModel?.release_date && <InfoRow compact label={t("releaseDate")} value={aaModel.release_date} />}
      </InfoCard>
      {aaModel && (
        <>
          <p className="text-xs font-semibold text-text-secondary mt-2">{t("modelDetail")}</p>
          <ModelDetailContent model={aaModel} />
        </>
      )}
    </DetailLayout>
  );
}

export function HallDetail({ decodedId }: { decodedId: string }) {
  const { data: aaData } = useSuspenseArtificialRankings();
  const hallucinationRankings = useHallucinationRankings(aaData);
  const entry = findModel(hallucinationRankings, decodedId, "id", "slug");
  const aaModel = findModel(aaData, decodedId, "id", "slug");
  if (!entry) return <NotFound />;
  return <HallDetailContent model={entry} aaModel={aaModel} />;
}

function OrDetailInner({ model }: { model: OpenRouterRankEntry }) {
  const { t, lang } = useTranslation();
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
          <InfoRow compact label={t("apiModelId")} value={<code className="font-mono text-xs bg-bg-secondary px-1 rounded">{model.id}</code>} />
          <InfoRow compact label={t("category")} value={categoryLabel(model.category, t)} />
          <InfoRow compact label={t("trend")} value={formatTrend(model.change, t)} />
          <InfoRow compact label={t("totalTokens")} value={formatShortNumber(model.totalTokens ?? 0)} />
        </InfoCard>
        <InfoCard title={t("pricing")}>
          <InfoRow compact label={t("promptPrice")} value={formatDollar(model.pricing?.prompt, t)} />
          <InfoRow compact label={t("completionPrice")} value={formatDollar(model.pricing?.completion, t)} />
        </InfoCard>
      </InfoGrid>
      <InfoCard title={t("techSelectionAdvice")}>
        <p className="text-xs text-text-secondary leading-relaxed">{getRecommendation(model.id, lang)}</p>
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

export function OrDetail({ decodedId }: { decodedId: string }) {
  const { data: orPayload } = useSuspenseOpenRouterRankings();
  const orData = orPayload?.tokenUsageRankings ?? [];
  const model = findModel(orData, decodedId, "id");
  if (!model) return <NotFound />;
  return <OrDetailInner model={model} />;
}

export function OsDetail({ model }: { model: OpenSourceModelEntry }) {
  const { t, lang } = useTranslation();
  return (
    <DetailLayout>
      <StatGrid columns={2}>
        <StatCard label={t("downloads")} value={formatShortNumber(model.downloads)} />
        <StatCard label={t("likes")} value={formatShortNumber(model.likes)} />
      </StatGrid>
      <InfoGrid>
        <InfoCard title={t("modelInfo")}>
          <InfoRow compact label={t("creator")} value={orNA(model.author, t)} />
          <InfoRow compact label={t("license")} value={orNA(model.license, t)} />
          <InfoRow compact label={t("task")} value={orNA(model.task, t)} />
          <InfoRow compact label={t("releaseDate")} value={model.createdAt ? formatDate(model.createdAt, lang) : t("notAvailable")} />
          <InfoRow compact label={t("lastUpdated")} value={model.lastModified ? formatDate(model.lastModified, lang) : t("notAvailable")} />
        </InfoCard>
        <InfoCard title={t("repository")}>
          <a href={`https://huggingface.co/${model.id.replace(/^\//, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-info hover:underline break-all">
            {model.id}
          </a>
        </InfoCard>
      </InfoGrid>
      {model.tags.length > 0 && (
        <InfoCard title={t("tags")}>
          <div className="flex flex-wrap gap-1.5">
            {model.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </InfoCard>
      )}
    </DetailLayout>
  );
}

export function TtsDetail({ model }: { model: TtsModel }) {
  const { t } = useTranslation();
  return (
    <DetailLayout>
      <StatGrid columns={3}>
        <StatCard label={t("ttsQualityElo")} value={model.quality_elo?.toFixed(0) ?? t("notAvailable")} />
        <StatCard label={t("ttsSpeed")} value={model.speed_chars_per_sec?.toFixed(0) ?? t("notAvailable")} />
        <StatCard label={t("ttsPrice")} value={formatDollar(model.price_per_1m_chars, t)} />
      </StatGrid>
      <InfoCard title={t("modelInfo")}>
        <InfoRow compact label={t("provider")} value={orNA(model.provider, t)} />
        <InfoRow compact label={t("modelNameOrId")} value={model.name} />
      </InfoCard>
    </DetailLayout>
  );
}
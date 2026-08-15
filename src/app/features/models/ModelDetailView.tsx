import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import {
  BackButton,
  StatCard,
  InfoCard,
  InfoRow,
  ModelDetailContent,
  DetailLayout,
  StatGrid,
  InfoGrid,
} from "@/app/components/composite";
import { Badge } from "@/app/components/ui";
import { SuspenseQuery, NotFound } from "@/app/components/shared";
import { PageContainer, PageHeader } from "@/app/components/layout";
import {
  useSuspenseArtificialRankings,
  useHallucinationRankings,
  useSuspenseOpenRouterRankings,
  useSuspenseOpenSourceReleases,
  useSuspenseTtsLeaderboard,
} from "@/app/api/queries";
import { findModel, formatShortNumber, formatTrend, formatDollar, formatDate, categoryLabel, orNA, getModelRecommendation } from "@/shared/utils";
import { MODEL_SOURCES, type ModelSource } from "@/shared/config";
import type {
  HallucinationRankingEntry,
  ArtificialAnalysisModel,
  OpenRouterRankEntry,
  OpenSourceModelEntry,
  TtsModel,
} from "@/shared/types";

function useModelSourceParams(): { src: ModelSource | null; decodedId: string } {
  const { source, "*": splat } = useParams<{ source: string; "*": string }>();
  const src = (source && source in MODEL_SOURCES ? source : null) as ModelSource | null;
  const decodedId = splat ? decodeURIComponent(splat) : "";
  return { src, decodedId };
}

function createDetailView<T>(
  useQuery: () => { data: T[] },
  Content: ComponentType<{ model: T }>,
  ...keys: (keyof T & string)[]
): ComponentType<{ decodedId: string }> {
  return function DetailView({ decodedId }: { decodedId: string }) {
    const { data } = useQuery();
    const model = findModel(data, decodedId, ...keys);
    if (!model) return <NotFound />;
    return <Content model={model} />;
  };
}

const AADetail = createDetailView(useSuspenseArtificialRankings, ModelDetailContent, "id", "slug");
const OSDetail = createDetailView(useSuspenseOpenSourceReleases, OsDetail, "id");
const TTSDetail = createDetailView(useSuspenseTtsLeaderboard, TtsDetail, "id", "name");

const SOURCE_LABELS: Record<ModelSource, string> = {
  aa: "artificialSource",
  or: "openRouterSource",
  os: "openSourceDataSource",
  hall: "hallucinationSource",
  tts: "ttsSource",
};

const SOURCE_COMPONENTS: Record<ModelSource, ComponentType<{ decodedId: string }>> = {
  aa: AADetail,
  or: OrDetail,
  os: OSDetail,
  hall: HallDetail,
  tts: TTSDetail,
};

function HallDetailContent({
  model,
  aaModel,
}: {
  model: HallucinationRankingEntry;
  aaModel?: ArtificialAnalysisModel;
}) {
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
          <InfoRow compact label={t("promptPrice")} value={formatDollar(model.pricing?.prompt, t)} />
          <InfoRow compact label={t("completionPrice")} value={formatDollar(model.pricing?.completion, t)} />
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
          <InfoRow
            compact
            label={t("releaseDate")}
            value={model.createdAt ? formatDate(model.createdAt, lang) : t("notAvailable")}
          />
          <InfoRow
            compact
            label={t("lastUpdated")}
            value={model.lastModified ? formatDate(model.lastModified, lang) : t("notAvailable")}
          />
        </InfoCard>
        <InfoCard title={t("repository")}>
          <a
            href={`https://huggingface.co/${model.id.replace(/^\//, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-info hover:underline break-all"
          >
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

function ModelDetailContentInner() {
  const { t } = useTranslation();
  const { src, decodedId } = useModelSourceParams();

  if (!src || !decodedId) return <NotFound />;

  const config = MODEL_SOURCES[src];
  const sourceLabel = t(SOURCE_LABELS[src] as Parameters<typeof t>[0]);
  const SourceComponent = SOURCE_COMPONENTS[src];

  return (
    <PageContainer>
      <BackButton labelKey={config.backLabelKey} to={config.backTo} />
      <PageHeader title={decodedId.split("/").pop() || decodedId} description={sourceLabel} />
      <SourceComponent decodedId={decodedId} />
    </PageContainer>
  );
}

export function ModelDetailView() {
  return (
    <SuspenseQuery>
      <ModelDetailContentInner />
    </SuspenseQuery>
  );
}
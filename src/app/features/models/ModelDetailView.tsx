import type { ComponentType } from "react";
import { useParams } from "react-router";
import { useTranslation } from "@/app/i18n";
import {
  BackButton,
  StatCard,
  InfoCard,
  InfoRow,
  ModelDetailContent,
  OpenRouterModelDetail,
  DetailLayout,
  StatGrid,
  InfoGrid,
} from "@/app/components/composite";
import { Badge } from "@/app/components/ui";
import { SuspenseQuery, NotFound, Spinner } from "@/app/components/shared";
import { PageContainer, PageHeader } from "@/app/components/layout";
import {
  useSuspenseArtificialRankings,
  useSuspenseOpenRouterRankings,
  useAllOpenSourceModels,
} from "@/app/api/queries";
import { useHallucinationRankings } from "@/app/domain/hallucination";
import {
  findModel,
  formatShortNumber,
  formatDate,
  orNA,
} from "@/shared/utils";
import { MODEL_SOURCES, type ModelSource } from "@/shared/config";
import type {
  HallucinationRankingEntry,
  ArtificialAnalysisModel,
  OpenSourceModelEntry,
} from "@/shared/types";

function useModelSourceParams(): { src: ModelSource | null; decodedId: string } {
  const { source, "*": splat } = useParams<{ source: string; "*": string }>();
  const src = (source && source in MODEL_SOURCES ? source : null) as ModelSource | null;
  const decodedId = splat ? decodeURIComponent(splat) : "";
  return { src, decodedId };
}

function createDetailView<T>(
  useQuery: () => { data: T[]; isPending?: boolean },
  Content: ComponentType<{ model: T }>,
  ...keys: (keyof T & string)[]
): ComponentType<{ decodedId: string }> {
  return function DetailView({ decodedId }: { decodedId: string }) {
    const { data, isPending } = useQuery();
    const model = findModel(data, decodedId, ...keys);
    if (!model && isPending) return <Spinner />;
    if (!model) return <NotFound />;
    return <Content model={model} />;
  };
}

const AADetail = createDetailView(useSuspenseArtificialRankings, ModelDetailContent, "id", "slug");
const OSDetail = createDetailView(useAllOpenSourceModels, OsDetail, "id");

const SOURCE_COMPONENTS: Record<ModelSource, ComponentType<{ decodedId: string }>> = {
  aa: AADetail,
  or: OrDetail,
  os: OSDetail,
  hall: HallDetail,
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
        <StatCard
          label={t("accuracy")}
          value={model.accuracy == null ? t("notAvailable") : `${model.accuracy.toFixed(1)}%`}
        />
        <StatCard
          label={t("hallucinationRate")}
          value={model.hallucinationRate == null ? t("notAvailable") : `${model.hallucinationRate.toFixed(1)}%`}
        />
        <StatCard
          label={t("attemptRate")}
          value={model.attemptRate == null ? t("notAvailable") : `${model.attemptRate.toFixed(1)}%`}
        />
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

function HallDetail({ decodedId }: { decodedId: string }) {
  const { data: aaData } = useSuspenseArtificialRankings();
  const hallucinationRankings = useHallucinationRankings(aaData);
  const entry = findModel(hallucinationRankings, decodedId, "id", "slug");
  const aaModel = findModel(aaData, decodedId, "id", "slug");
  if (!entry) return <NotFound />;
  return <HallDetailContent model={entry} aaModel={aaModel} />;
}

function OrDetail({ decodedId }: { decodedId: string }) {
  const { data: orPayload } = useSuspenseOpenRouterRankings();
  const orData = orPayload?.tokenUsageRankings ?? [];
  const model = findModel(orData, decodedId, "id");
  if (!model) return <NotFound />;
  return <OpenRouterModelDetail model={model} />;
}

function OsDetail({ model }: { model: OpenSourceModelEntry }) {
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

function ModelDetailContentInner() {
  const { t } = useTranslation();
  const { src, decodedId } = useModelSourceParams();

  if (!src || !decodedId) return <NotFound />;

  const config = MODEL_SOURCES[src];
  const sourceLabel = t(config.sourceLabelKey);
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

import type { ComponentType } from "react";
import { useTranslation } from "../../i18n";
import { BackButton } from "../../components/composite";
import { SuspenseQuery } from "../../components/feedback/SuspenseQuery";
import { NotFound } from "../system";

import { MODEL_SOURCES, type ModelSource } from "../../../shared/config";
import { useParams } from "react-router-dom";
import { findModel } from "../../../shared/utils";
import { useSuspenseArtificialRankings, useSuspenseOpenSourceReleases, useSuspenseTtsLeaderboard } from "../../api/queries";
import { ModelDetailContent } from "../../components/composite";
import { OsDetail, TtsDetail, OrDetail, HallDetail } from "./detail";
import { PageContainer, PageHeader } from "../../components/layout";

function useModelSourceParams(): { src: ModelSource | null; decodedId: string } {
  const { source, "*": splat } = useParams<{ source: string; "*": string }>();
  const src = (source && source in MODEL_SOURCES ? source : null) as ModelSource | null;
  const decodedId = splat ? decodeURIComponent(splat) : "";
  return { src, decodedId };
}

function createDetailView<T>(useQuery: () => { data: T[] }, Content: ComponentType<{ model: T }>, ...keys: (keyof T & string)[]): ComponentType<{ decodedId: string }> {
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

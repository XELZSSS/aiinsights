import { useTranslation } from "@/app/i18n";
import type { TFunction } from "@/shared/i18n";
import type { ArtificialAnalysisModel } from "@/shared/types";
import {
  formatBoolean,
  formatPricePerMillion,
  formatScore,
  formatTokens,
  benchmarkLabel,
  orNA,
  normalizePercent,
  getOutputSpeed,
} from "@/shared/utils";
import { DetailLayout, StatGrid, InfoGrid } from "./layout";
import { InfoCard, InfoRow } from "./info-card";
import { StatCard } from "./stat-card";

const MODALITY_STYLES = {
  text: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  image: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  speech: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  video: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
} as const;

function ModalitySection({
  label,
  prefix,
  model,
  t,
}: {
  label: string;
  prefix: "input" | "output";
  model: ArtificialAnalysisModel;
  t: TFunction;
}) {
  const key = (m: string) => `${prefix}_modality_${m}` as keyof ArtificialAnalysisModel;
  return (
    <div>
      <div className="text-xs font-medium mb-2 text-text-secondary">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {(["text", "image", "speech", "video"] as const).map((m) =>
          model[key(m)] ? (
            <span key={m} className={`px-2.5 py-0.5 text-xs font-medium rounded-md ${MODALITY_STYLES[m]}`}>
              {t(`modality${m.charAt(0).toUpperCase() + m.slice(1)}` as Parameters<TFunction>[0])}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function ModelDetailContent({
  model,
  showBenchmarks = true,
}: {
  model: ArtificialAnalysisModel;
  showBenchmarks?: boolean;
}) {
  const { t } = useTranslation();
  const pricing = model.pricing;
  return (
    <DetailLayout>
      <StatGrid columns={4}>
        <StatCard label={t("intelligenceIndex")} value={formatScore(t, model.intelligence_index)} />
        <StatCard label={t("coding")} value={formatScore(t, model.coding_index)} />
        <StatCard label={t("agentic")} value={formatScore(t, model.agentic_index)} />
        <StatCard label={t("outputSpeed")} value={formatScore(t, getOutputSpeed(model))} />
      </StatGrid>
      <InfoGrid>
        <InfoCard title={t("modelInfo")}>
          <InfoRow compact label={t("creator")} value={orNA(model.model_creators?.name, t)} />
          <InfoRow compact label={t("releaseDate")} value={orNA(model.release_date, t)} />
          <InfoRow compact label={t("openWeights")} value={formatBoolean(t, model.is_open_weights)} />
          <InfoRow compact label={t("reasoning")} value={formatBoolean(t, model.is_reasoning === true)} />
          <InfoRow compact label={t("contextWindow")} value={formatTokens(model.context_window_tokens, t)} />
        </InfoCard>
        <InfoCard title={t("pricing")}>
          <InfoRow compact label={t("promptPrice")} value={formatPricePerMillion(pricing?.input, t)} />
          <InfoRow compact label={t("completionPrice")} value={formatPricePerMillion(pricing?.output, t)} />
          <InfoRow compact label={t("cacheHitPrice")} value={formatPricePerMillion(pricing?.cache_hit, t)} />
          <InfoRow compact label={t("blendedPrice")} value={formatPricePerMillion(model.blended_price, t)} />
        </InfoCard>
      </InfoGrid>
      {showBenchmarks && model.benchmarks && Object.values(model.benchmarks).some((v) => v != null) && (
        <InfoCard title={t("benchmarks")}>
          <StatGrid columns={4}>
            {Object.entries(model.benchmarks).map(([key, value]) => {
              const normalized = normalizePercent(value);
              return normalized == null ? null : (
                <StatCard key={key} label={benchmarkLabel(key, t)} value={formatScore(t, normalized)} />
              );
            })}
          </StatGrid>
        </InfoCard>
      )}
      <InfoCard title={t("modalities")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModalitySection label={t("inputModality")} prefix="input" model={model} t={t} />
          <ModalitySection label={t("outputModality")} prefix="output" model={model} t={t} />
        </div>
      </InfoCard>
    </DetailLayout>
  );
}

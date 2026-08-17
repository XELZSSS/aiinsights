import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { DataTable } from "@/app/components/data";
import { useTranslation } from "@/app/i18n";
import { useCompareStore } from "@/app/stores";
import { modelId } from "@/shared/utils";
import { TabButton, CompareChipBar, SegmentedGroup } from "@/app/components/composite";
import { Input } from "@/app/components/ui";

import { formatDollar } from "@/shared/utils";
import { calcModelCost } from "@/shared/utils";

import type { ArtificialAnalysisModel } from "@/shared/types";
import {
  buildRankingColumns,
  buildPricingColumns,
  ModelExpandedDetail,
} from "@/app/features/rankings/columns";

import { BLENDED_PRICE_KEY, RANKING_BENCHMARK_KEYS, BENCHMARK_LABELS } from "@/shared/config";
import { useSearchStore } from "@/app/stores";
import { buildBenchmarkColumns } from "@/app/features/rankings/columns";

type ViewMode = "rankings" | "pricing" | "benchmarks";
type ReasoningFilter = "all" | "reasoning" | "non-reasoning";

const REASONING_KEYWORDS = /\b(reasoning|thinking)\b/i;
const REASONING_PREFIXES = /^(o[134]|gpt-5)/i;

function isReasoningModel(model: ArtificialAnalysisModel) {
  return REASONING_KEYWORDS.test(model.name) || REASONING_PREFIXES.test(model.name);
}

function matchesSearch(model: ArtificialAnalysisModel, term: string): boolean {
  if (!term) return true;
  return (
    model.name.toLowerCase().includes(term) ||
    model.slug.toLowerCase().includes(term) ||
    (model.model_creators?.name || "").toLowerCase().includes(term)
  );
}

function matchesModality(model: ArtificialAnalysisModel, modality: string): boolean {
  if (modality === "all") return true;
  switch (modality) {
    case "text":
      return !!(model.input_modality_text || model.output_modality_text);
    case "image":
      return !!(model.input_modality_image || model.output_modality_image);
    case "speech":
      return !!(model.input_modality_speech || model.output_modality_speech);
    case "video":
      return !!(model.input_modality_video || model.output_modality_video);
    default:
      return true;
  }
}

function useAARankingFilters(rankings: ArtificialAnalysisModel[]) {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>(
    (location.state as { viewMode?: ViewMode })?.viewMode ?? "rankings",
  );
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilter>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");

  const searchTerm = useSearchStore((s) => s.searchTerm);

  const filtered = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase().trim();
    return rankings.filter((model) => {
      if (viewMode === "rankings") {
        if (typeof model.intelligence_index !== "number" || !Number.isFinite(model.intelligence_index)) return false;
      } else if (viewMode === "pricing") {
        const p = model.pricing;
        if (
          p?.input == null &&
          p?.output == null &&
          p?.cache_hit == null &&
          p?.blended?.[BLENDED_PRICE_KEY] == null
        )
          return false;
      } else {
        return true;
      }

      if (reasoningFilter === "reasoning" && !isReasoningModel(model)) return false;
      if (reasoningFilter === "non-reasoning" && isReasoningModel(model)) return false;

      if (!matchesSearch(model, lowerTerm)) return false;

      if (!matchesModality(model, modalityFilter)) return false;

      return true;
    });
  }, [rankings, viewMode, reasoningFilter, searchTerm, modalityFilter]);

  return { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter, modalityFilter, setModalityFilter };
}

function useCostEstimator(filteredRankings: ArtificialAnalysisModel[]) {
  const [promptTokens, setPromptTokens] = useState("100000");
  const [completionTokens, setCompletionTokens] = useState("30000");
  const deferredPrompt = useDeferredValue(promptTokens);
  const deferredCompletion = useDeferredValue(completionTokens);
  const calcPrompt = Number(deferredPrompt) || 0;
  const calcCompletion = Number(deferredCompletion) || 0;
  const avgCost = useMemo(() => {
    let total = 0,
      count = 0;
    for (const m of filteredRankings) {
      const cost = calcModelCost(m, calcPrompt, calcCompletion);
      if (cost != null) {
        total += cost;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }, [filteredRankings, calcPrompt, calcCompletion]);
  return { promptTokens, setPromptTokens, completionTokens, setCompletionTokens, calcPrompt, calcCompletion, avgCost };
}

function FilterToolbar({
  viewMode,
  onViewModeChange,
  reasoningFilter,
  onReasoningFilterChange,
  modalityFilter,
  onModalityFilterChange,
  selectedBenchmark,
  onBenchmarkChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  reasoningFilter: ReasoningFilter;
  onReasoningFilterChange: (filter: ReasoningFilter) => void;
  modalityFilter: string;
  onModalityFilterChange: (filter: string) => void;
  selectedBenchmark?: string;
  onBenchmarkChange?: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center">
            <SegmentedGroup>
              <TabButton active={viewMode === "rankings"} onClick={() => onViewModeChange("rankings")}>
                {t("modelRankings")}
              </TabButton>
              <TabButton active={viewMode === "pricing"} onClick={() => onViewModeChange("pricing")}>
                {t("pricing")}
              </TabButton>
              <TabButton active={viewMode === "benchmarks"} onClick={() => onViewModeChange("benchmarks")}>
                {t("benchmarks")}
              </TabButton>
            </SegmentedGroup>
            {viewMode !== "benchmarks" && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <SegmentedGroup>
                  <TabButton active={reasoningFilter === "all"} onClick={() => onReasoningFilterChange("all")}>
                    {t("all")}
                  </TabButton>
                  <TabButton
                    active={reasoningFilter === "reasoning"}
                    onClick={() => onReasoningFilterChange("reasoning")}
                  >
                    {t("reasoning")}
                  </TabButton>
                  <TabButton
                    active={reasoningFilter === "non-reasoning"}
                    onClick={() => onReasoningFilterChange("non-reasoning")}
                  >
                    {t("nonReasoning")}
                  </TabButton>
                </SegmentedGroup>
                <SegmentedGroup className="overflow-x-auto no-scrollbar max-w-full">
                  <TabButton active={modalityFilter === "all"} onClick={() => onModalityFilterChange("all")}>
                    {t("allModalities")}
                  </TabButton>
                  <TabButton active={modalityFilter === "text"} onClick={() => onModalityFilterChange("text")}>
                    {t("textOnly")}
                  </TabButton>
                  <TabButton active={modalityFilter === "image"} onClick={() => onModalityFilterChange("image")}>
                    {t("imageInput")}
                  </TabButton>
                  <TabButton active={modalityFilter === "speech"} onClick={() => onModalityFilterChange("speech")}>
                    {t("speechInput")}
                  </TabButton>
                  <TabButton active={modalityFilter === "video"} onClick={() => onModalityFilterChange("video")}>
                    {t("videoInput")}
                  </TabButton>
                </SegmentedGroup>
              </>
            )}
          </div>
        </div>
      </div>
      {viewMode === "benchmarks" && onBenchmarkChange && (
        <SegmentedGroup className="w-full sm:w-fit overflow-x-auto no-scrollbar">
          {RANKING_BENCHMARK_KEYS.map((key) => (
            <TabButton key={key} active={selectedBenchmark === key} onClick={() => onBenchmarkChange(key)}>
              {t(BENCHMARK_LABELS[key])}
            </TabButton>
          ))}
        </SegmentedGroup>
      )}
    </div>
  );
}

function PricingInputs({
  promptTokens,
  onPromptTokensChange,
  completionTokens,
  onCompletionTokensChange,
  avgCost,
}: {
  promptTokens: string;
  onPromptTokensChange: (v: string) => void;
  completionTokens: string;
  onCompletionTokensChange: (v: string) => void;
  avgCost: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3 flex-wrap items-center p-3 rounded-lg border border-border bg-bg-secondary">
      <Input
        type="number"
        value={promptTokens}
        onChange={(e) => onPromptTokensChange(e.target.value)}
        className="w-full sm:w-44"
        placeholder={t("monthlyPromptTokens")}
      />
      <Input
        type="number"
        value={completionTokens}
        onChange={(e) => onCompletionTokensChange(e.target.value)}
        className="w-full sm:w-44"
        placeholder={t("monthlyCompletionTokens")}
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-text-secondary">{t("estimatedMonthlyCost")}:</span>
        <span className="text-base font-bold font-mono">{formatDollar(avgCost, t)}</span>
        <span className="text-xs text-text-secondary">{t("perModelAvg")}</span>
      </div>
    </div>
  );
}

export function ArtificialAnalysisView({ rankings }: { rankings: ArtificialAnalysisModel[] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const compareIds = useCompareStore((s) => s.compareIds);
  const toggleCompareModel = useCompareStore((s) => s.toggleCompareModel);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("aime25");

  const { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter, modalityFilter, setModalityFilter } =
    useAARankingFilters(rankings);
  const { promptTokens, setPromptTokens, completionTokens, setCompletionTokens, calcPrompt, calcCompletion, avgCost } =
    useCostEstimator(filtered);

  const benchmarkFiltered = useMemo(
    () =>
      rankings
        .filter((m) => m.benchmarks?.[selectedBenchmark] != null)
        .sort((a, b) => (b.benchmarks?.[selectedBenchmark] ?? 0) - (a.benchmarks?.[selectedBenchmark] ?? 0)),
    [rankings, selectedBenchmark],
  );

  const rankingColumns = useMemo(() => buildRankingColumns(t), [t]);
  const pricingColumns = useMemo(() => buildPricingColumns(t), [t]);
  const benchmarkColumns = useMemo(() => buildBenchmarkColumns(t, selectedBenchmark), [t, selectedBenchmark]);

  const pricingRows = useMemo(
    () => filtered.map((model) => ({ model, monthlyCost: calcModelCost(model, calcPrompt, calcCompletion) })),
    [filtered, calcPrompt, calcCompletion],
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterToolbar
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setExpandedRowId(null);
        }}
        reasoningFilter={reasoningFilter}
        onReasoningFilterChange={setReasoningFilter}
        modalityFilter={modalityFilter}
        onModalityFilterChange={setModalityFilter}
        selectedBenchmark={selectedBenchmark}
        onBenchmarkChange={setSelectedBenchmark}
      />

      {viewMode === "pricing" && (
        <PricingInputs
          promptTokens={promptTokens}
          onPromptTokensChange={setPromptTokens}
          completionTokens={completionTokens}
          onCompletionTokensChange={setCompletionTokens}
          avgCost={avgCost}
        />
      )}

      {viewMode !== "benchmarks" && (
        <>
          <CompareChipBar
            models={compareIds
              .map((id) => rankings.find((m) => (m.id || m.slug) === id))
              .filter((m): m is ArtificialAnalysisModel => !!m)}
            onRemove={(model) => toggleCompareModel(model)}
            onClear={clearCompare}
            onCompare={() => navigate(viewMode === "pricing" ? "/price-compare" : "/compare")}
          />
          {viewMode === "pricing" ? (
            <DataTable
              data={pricingRows}
              columns={pricingColumns}
              getRowId={(row) => modelId(row.model)}
              expandedRowId={expandedRowId}
              onToggleExpand={setExpandedRowId}
              renderExpandedRow={(row) => <ModelExpandedDetail model={row.model} />}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={rankingColumns}
              getRowId={modelId}
              expandedRowId={expandedRowId}
              onToggleExpand={setExpandedRowId}
              renderExpandedRow={(model) => <ModelExpandedDetail model={model} />}
            />
          )}
        </>
      )}

      {viewMode === "benchmarks" && (
        <DataTable data={benchmarkFiltered} columns={benchmarkColumns} getRowId={modelId} />
      )}
    </div>
  );
}

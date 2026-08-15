import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DataTable } from "../../components/data/DataTable";
import { useTranslation } from "../../i18n";
import { useCompareStore } from "../../stores";
import { modelId } from "../../../shared/utils";
import { TabButton } from "../../components/composite";
import { Input } from "../../components/ui";

import { formatDollar } from "../../../shared/utils/format";
import { calcModelCost } from "../../../shared/utils";

import type { ArtificialAnalysisModel } from "../../../shared/types";
import { buildRankingColumns, buildPricingColumns, ModelExpandedDetail, type PricedModel } from "./columns";

import { useAARankingFilters, type ViewMode, type ReasoningFilter } from "./useAARankingFilters";
import { CompareChipBar } from "../../components/composite";
import { RANKING_BENCHMARK_KEYS, BENCHMARK_LABELS } from "../../../shared/config";
import { buildBenchmarkColumns } from "./columns";

function getRowId(model: ArtificialAnalysisModel) {
  return model.id || model.slug;
}

const renderAAExpandedRow = (model: ArtificialAnalysisModel) => <ModelExpandedDetail model={model} />;

const getPricedRowId = (row: PricedModel) => row.model.id || row.model.slug;

const renderPricedExpandedRow = (row: PricedModel) => <ModelExpandedDetail model={row.model} />;

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
          <p className="text-xs text-text-secondary mb-1">{t("artificialSource")}</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            <div className="flex gap-1 p-0.5 rounded-lg bg-bg-secondary">
              <TabButton active={viewMode === "rankings"} onClick={() => onViewModeChange("rankings")}>
                {t("modelRankings")}
              </TabButton>
              <TabButton active={viewMode === "pricing"} onClick={() => onViewModeChange("pricing")}>
                {t("pricing")}
              </TabButton>
              <TabButton active={viewMode === "benchmarks"} onClick={() => onViewModeChange("benchmarks")}>
                {t("benchmarks")}
              </TabButton>
            </div>
            {viewMode !== "benchmarks" && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <div className="flex gap-1 p-0.5 rounded-lg bg-bg-secondary">
                  <TabButton active={reasoningFilter === "all"} onClick={() => onReasoningFilterChange("all")}>
                    {t("all")}
                  </TabButton>
                  <TabButton active={reasoningFilter === "reasoning"} onClick={() => onReasoningFilterChange("reasoning")}>
                    {t("reasoning")}
                  </TabButton>
                  <TabButton active={reasoningFilter === "non-reasoning"} onClick={() => onReasoningFilterChange("non-reasoning")}>
                    {t("nonReasoning")}
                  </TabButton>
                </div>
                <div className="hidden sm:flex gap-1 p-0.5 rounded-lg bg-bg-secondary">
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {viewMode === "benchmarks" && onBenchmarkChange && (
        <div className="flex gap-1 p-0.5 rounded-lg bg-bg-secondary w-fit">
          {RANKING_BENCHMARK_KEYS.map((key) => (
            <TabButton key={key} active={selectedBenchmark === key} onClick={() => onBenchmarkChange(key)}>
              {t(BENCHMARK_LABELS[key])}
            </TabButton>
          ))}
        </div>
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
      <Input type="number" value={promptTokens} onChange={(e) => onPromptTokensChange(e.target.value)} className="w-full sm:w-44" placeholder={t("monthlyPromptTokens")} />
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

  const { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter, modalityFilter, setModalityFilter } = useAARankingFilters(rankings);
  const { promptTokens, setPromptTokens, completionTokens, setCompletionTokens, calcPrompt, calcCompletion, avgCost } = useCostEstimator(filtered);

  const benchmarkFiltered = useMemo(
    () => rankings.filter((m) => m.benchmarks?.[selectedBenchmark] != null).sort((a, b) => (b.benchmarks?.[selectedBenchmark] ?? 0) - (a.benchmarks?.[selectedBenchmark] ?? 0)),
    [rankings, selectedBenchmark],
  );

  const rankingColumns = useMemo(() => buildRankingColumns(t), [t]);
  const pricingColumns = useMemo(() => buildPricingColumns(t), [t]);
  const benchmarkColumns = useMemo(() => buildBenchmarkColumns(t, selectedBenchmark), [t, selectedBenchmark]);

  // Cost is derived here so buildPricingColumns stays token-agnostic and the
  // column array survives token edits (only the rows recompute).
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
            models={compareIds.map((id) => rankings.find((m) => (m.id || m.slug) === id)).filter((m): m is ArtificialAnalysisModel => !!m)}
            onRemove={(model) => toggleCompareModel(model)}
            onClear={clearCompare}
            onCompare={() => navigate(viewMode === "pricing" ? "/price-compare" : "/compare")}
          />
          {viewMode === "pricing" ? (
            <DataTable
              data={pricingRows}
              columns={pricingColumns}
              getRowId={getPricedRowId}
              expandedRowId={expandedRowId}
              onToggleExpand={setExpandedRowId}
              renderExpandedRow={renderPricedExpandedRow}
            />
          ) : (
            <DataTable
              data={filtered}
              columns={rankingColumns}
              getRowId={modelId as (m: ArtificialAnalysisModel) => string}
              expandedRowId={expandedRowId}
              onToggleExpand={setExpandedRowId}
              renderExpandedRow={renderAAExpandedRow}
            />
          )}
        </>
      )}

      {viewMode === "benchmarks" && <DataTable data={benchmarkFiltered} columns={benchmarkColumns} getRowId={getRowId} />}
    </div>
  );
}

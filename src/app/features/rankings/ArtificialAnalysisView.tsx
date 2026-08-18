import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { DataTable } from "@/app/components/data";
import { useTranslation } from "@/app/i18n";
import { useCompareStore, useSearchStore } from "@/app/stores";
import { modelId, formatDollar, calcModelCost } from "@/shared/utils";
import { TabButton, CompareChipBar, SegmentedGroup } from "@/app/components/composite";
import { Input } from "@/app/components/ui";

import type { ArtificialAnalysisModel } from "@/shared/types";
import { buildRankingColumns, buildPricingColumns, ModelExpandedDetail } from "@/app/features/rankings/columns";

type ViewMode = "rankings" | "pricing";
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

function useAARankingFilters(rankings: ArtificialAnalysisModel[]) {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>(
    (location.state as { viewMode?: ViewMode })?.viewMode ?? "rankings",
  );
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilter>("all");

  const searchTerm = useSearchStore((s) => s.searchTerm);

  const filtered = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase().trim();
    return rankings.filter((model) => {
      if (reasoningFilter === "reasoning" && !isReasoningModel(model)) return false;
      if (reasoningFilter === "non-reasoning" && isReasoningModel(model)) return false;

      if (!matchesSearch(model, lowerTerm)) return false;

      return true;
    });
  }, [rankings, viewMode, reasoningFilter, searchTerm]);

  return { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter };
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
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  reasoningFilter: ReasoningFilter;
  onReasoningFilterChange: (filter: ReasoningFilter) => void;
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
            </SegmentedGroup>
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
            </>
          </div>
        </div>
      </div>
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

  const { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter } = useAARankingFilters(rankings);
  const { promptTokens, setPromptTokens, completionTokens, setCompletionTokens, calcPrompt, calcCompletion, avgCost } =
    useCostEstimator(filtered);

  const rankingColumns = useMemo(() => buildRankingColumns(t), [t]);
  const pricingColumns = useMemo(() => buildPricingColumns(t), [t]);

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

      <CompareChipBar
        models={compareIds
          .map((id) => rankings.find((m) => modelId(m) === id))
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
    </div>
  );
}

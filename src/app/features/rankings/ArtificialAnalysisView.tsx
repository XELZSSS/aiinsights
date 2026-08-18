import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { DataTable } from "@/app/components/data";
import { useTranslation } from "@/app/i18n";
import { useCompareStore, useSearchStore } from "@/app/stores";
import { modelId, formatDollar, calcMonthlyCost } from "@/shared/utils";
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
  const [dailyInput, setDailyInput] = useState("2");
  const [dailyOutput, setDailyOutput] = useState("1");
  const [dailyReasoning, setDailyReasoning] = useState("2");
  const [cacheHitRate, setCacheHitRate] = useState("50");
  const [daysPerMonth, setDaysPerMonth] = useState("22");
  const deferredInput = useDeferredValue(dailyInput);
  const deferredOutput = useDeferredValue(dailyOutput);
  const deferredReasoning = useDeferredValue(dailyReasoning);
  const deferredCache = useDeferredValue(cacheHitRate);
  const deferredDays = useDeferredValue(daysPerMonth);
  const calcInput = Number(deferredInput) || 0;
  const calcOutput = Number(deferredOutput) || 0;
  const calcReasoning = Number(deferredReasoning) || 0;
  const calcCache = Math.max(0, Math.min(100, Number(deferredCache) || 0)) / 100;
  const calcDays = Math.max(1, Number(deferredDays) || 0);
  const avgCost = useMemo(() => {
    let total = 0,
      count = 0;
    for (const m of filteredRankings) {
      const cost = calcMonthlyCost(m, {
        dailyInput: calcInput * 1_000_000,
        dailyOutput: calcOutput * 1_000_000,
        dailyReasoning: calcReasoning * 1_000_000,
        cacheHitRate: calcCache,
        daysPerMonth: calcDays,
      });
      if (cost != null) {
        total += cost;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }, [filteredRankings, calcInput, calcOutput, calcReasoning, calcCache, calcDays]);
  return {
    dailyInput,
    setDailyInput,
    dailyOutput,
    setDailyOutput,
    dailyReasoning,
    setDailyReasoning,
    cacheHitRate,
    setCacheHitRate,
    daysPerMonth,
    setDaysPerMonth,
    calcInput,
    calcOutput,
    calcReasoning,
    calcCache,
    calcDays,
    avgCost,
  };
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
  dailyInput,
  onDailyInputChange,
  dailyOutput,
  onDailyOutputChange,
  dailyReasoning,
  onDailyReasoningChange,
  cacheHitRate,
  onCacheHitRateChange,
  daysPerMonth,
  onDaysPerMonthChange,
  avgCost,
}: {
  dailyInput: string;
  onDailyInputChange: (v: string) => void;
  dailyOutput: string;
  onDailyOutputChange: (v: string) => void;
  dailyReasoning: string;
  onDailyReasoningChange: (v: string) => void;
  cacheHitRate: string;
  onCacheHitRateChange: (v: string) => void;
  daysPerMonth: string;
  onDaysPerMonthChange: (v: string) => void;
  avgCost: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3 flex-wrap items-center p-3 rounded-lg border border-border bg-bg-secondary">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={dailyInput}
          onChange={(e) => onDailyInputChange(e.target.value)}
          className="w-24 sm:w-28"
          placeholder={t("dailyPromptTokens")}
        />
        <span className="text-xs text-text-secondary">{t("dailyPromptTokens")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={dailyOutput}
          onChange={(e) => onDailyOutputChange(e.target.value)}
          className="w-24 sm:w-28"
          placeholder={t("dailyCompletionTokens")}
        />
        <span className="text-xs text-text-secondary">{t("dailyCompletionTokens")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={dailyReasoning}
          onChange={(e) => onDailyReasoningChange(e.target.value)}
          className="w-24 sm:w-28"
          placeholder={t("dailyReasoningTokens")}
        />
        <span className="text-xs text-text-secondary">{t("dailyReasoningTokens")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={cacheHitRate}
          onChange={(e) => onCacheHitRateChange(e.target.value)}
          className="w-20 sm:w-24"
          placeholder={t("cacheHitRate")}
        />
        <span className="text-xs text-text-secondary">{t("cacheHitRate")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={daysPerMonth}
          onChange={(e) => onDaysPerMonthChange(e.target.value)}
          className="w-20 sm:w-24"
          placeholder={t("daysPerMonth")}
        />
        <span className="text-xs text-text-secondary">{t("daysPerMonth")}</span>
      </div>
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
  const {
    dailyInput,
    setDailyInput,
    dailyOutput,
    setDailyOutput,
    dailyReasoning,
    setDailyReasoning,
    cacheHitRate,
    setCacheHitRate,
    daysPerMonth,
    setDaysPerMonth,
    calcInput,
    calcOutput,
    calcReasoning,
    calcCache,
    calcDays,
    avgCost,
  } = useCostEstimator(filtered);

  const rankingColumns = useMemo(() => buildRankingColumns(t), [t]);
  const pricingColumns = useMemo(() => buildPricingColumns(t), [t]);

  const pricingRows = useMemo(
    () =>
      filtered.map((model) => ({
        model,
        monthlyCost: calcMonthlyCost(model, {
          dailyInput: calcInput * 1_000_000,
          dailyOutput: calcOutput * 1_000_000,
          dailyReasoning: calcReasoning * 1_000_000,
          cacheHitRate: calcCache,
          daysPerMonth: calcDays,
        }),
      })),
    [filtered, calcInput, calcOutput, calcReasoning, calcCache, calcDays],
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
          dailyInput={dailyInput}
          onDailyInputChange={setDailyInput}
          dailyOutput={dailyOutput}
          onDailyOutputChange={setDailyOutput}
          dailyReasoning={dailyReasoning}
          onDailyReasoningChange={setDailyReasoning}
          cacheHitRate={cacheHitRate}
          onCacheHitRateChange={setCacheHitRate}
          daysPerMonth={daysPerMonth}
          onDaysPerMonthChange={setDaysPerMonth}
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

import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";

import { DataTable } from "@/app/components/data";
import { useTranslation } from "@/app/i18n";
import { useCompareStore } from "@/app/stores";
import { useFilteredData, useMonthlyCosts } from "@/app/hooks";
import { modelId } from "@/shared/utils";
import { TabButton, CompareChipBar, SegmentedGroup, CostEstimatorInputs } from "@/app/components/composite";

import type { ArtificialAnalysisModel } from "@/shared/types";
import { buildRankingColumns, buildPricingColumns, ModelExpandedDetail } from "@/app/features/rankings/columns";

type ViewMode = "rankings" | "pricing";
type ReasoningFilter = "all" | "reasoning" | "non-reasoning";

function isReasoningModel(model: ArtificialAnalysisModel) {
  return model.is_reasoning === true;
}

function useAARankingFilters(rankings: ArtificialAnalysisModel[]) {
  const location = useLocation();
  // Restore the last-used view mode when navigating back (e.g. from the compare page).
  const [viewMode, setViewMode] = useState<ViewMode>(
    (location.state as { viewMode?: ViewMode })?.viewMode ?? "rankings",
  );
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilter>("all");

  const searchFiltered = useFilteredData(rankings, (model) => [
    model.name,
    model.slug,
    model.model_creators?.name ?? "",
  ]);

  const filtered = useMemo(() => {
    if (reasoningFilter === "reasoning") return searchFiltered.filter(isReasoningModel);
    if (reasoningFilter === "non-reasoning") return searchFiltered.filter((m) => !isReasoningModel(m));
    return searchFiltered;
  }, [searchFiltered, reasoningFilter]);

  return { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter };
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
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center">
            <SegmentedGroup className="overflow-x-auto no-scrollbar">
              <TabButton active={viewMode === "rankings"} onClick={() => onViewModeChange("rankings")}>
                {t("modelRankings")}
              </TabButton>
              <TabButton active={viewMode === "pricing"} onClick={() => onViewModeChange("pricing")}>
                {t("pricing")}
              </TabButton>
            </SegmentedGroup>
            <>
              <div className="w-px h-4 bg-border mx-1 shrink-0" />
              <SegmentedGroup className="overflow-x-auto no-scrollbar">
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

/**
 * Artificial Analysis rankings/pricing tables with compare support, a reasoning
 * filter and estimated monthly costs.
 */
export function ArtificialAnalysisView({ rankings }: { rankings: ArtificialAnalysisModel[] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const compareIds = useCompareStore((s) => s.compareIds);
  const toggleCompareModel = useCompareStore((s) => s.toggleCompareModel);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { filtered, viewMode, setViewMode, reasoningFilter, setReasoningFilter } = useAARankingFilters(rankings);
  const { monthlyCosts, ...costInputs } = useMonthlyCosts(filtered);

  const avgCost = useMemo(() => {
    const valid = monthlyCosts.filter((v): v is number => v != null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
  }, [monthlyCosts]);

  const rankingColumns = useMemo(() => buildRankingColumns(t), [t]);
  const pricingColumns = useMemo(() => buildPricingColumns(t), [t]);

  const pricingRows = useMemo(
    () => filtered.map((model, index) => ({ model, monthlyCost: monthlyCosts[index] ?? null })),
    [filtered, monthlyCosts],
  );

  return (
    <div className="flex flex-col gap-3">
      <FilterToolbar
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          // Reset any expanded detail row when switching between rankings and pricing.
          setViewMode(mode);
          setExpandedRowId(null);
        }}
        reasoningFilter={reasoningFilter}
        onReasoningFilterChange={setReasoningFilter}
      />

      {viewMode === "pricing" && (
        <div className="flex gap-3 flex-wrap items-center p-3 rounded-lg border border-border bg-bg-secondary">
          <CostEstimatorInputs state={costInputs} layout="input-label" avgCost={avgCost} />
        </div>
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
          pageSize={8}
          expandedRowId={expandedRowId}
          onToggleExpand={setExpandedRowId}
          renderExpandedRow={(row) => <ModelExpandedDetail model={row.model} />}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={rankingColumns}
          getRowId={modelId}
          pageSize={8}
          expandedRowId={expandedRowId}
          onToggleExpand={setExpandedRowId}
          renderExpandedRow={(model) => <ModelExpandedDetail model={model} />}
        />
      )}
    </div>
  );
}

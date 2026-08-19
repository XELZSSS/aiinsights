import { memo } from "react";
import { Input } from "@/app/components/ui";
import { useTranslation } from "@/app/i18n";
import { formatDollar } from "@/shared/utils";
import type { TFunction } from "@/shared/i18n";
import type { CostInputState } from "@/app/hooks/useCostEstimator";

interface CostFieldDef {
  value: string;
  onChange: (v: string) => void;
  label: string;
  unit?: string;
}

function getCostFields(state: CostInputState, t: TFunction): CostFieldDef[] {
  return [
    { value: state.dailyInput, onChange: state.setDailyInput, label: t("dailyPromptTokens"), unit: "M" },
    { value: state.dailyOutput, onChange: state.setDailyOutput, label: t("dailyCompletionTokens"), unit: "M" },
    { value: state.dailyReasoning, onChange: state.setDailyReasoning, label: t("dailyReasoningTokens"), unit: "M" },
    { value: state.cacheHitRate, onChange: state.setCacheHitRate, label: t("cacheHitRate"), unit: "%" },
    { value: state.daysPerMonth, onChange: state.setDaysPerMonth, label: t("daysPerMonth") },
  ];
}

export interface CostEstimatorInputsProps {
  state: CostInputState;
  layout?: "input-label" | "label-input-unit";
  avgCost?: number;
}

export const CostEstimatorInputs = memo(function CostEstimatorInputs({
  state,
  layout = "input-label",
  avgCost,
}: CostEstimatorInputsProps) {
  const { t } = useTranslation();
  const fields = getCostFields(state, t);

  return (
    <>
      {fields.map((field, _i) =>
        layout === "label-input-unit" ? (
          <div key={field.label} className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">{field.label}</label>
            <Input
              type="number"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-20 h-9 text-sm"
            />
            {field.unit ? <span className="text-xs text-text-secondary">{field.unit}</span> : null}
          </div>
        ) : (
          <div key={field.label} className="flex items-center gap-1.5">
            <Input
              type="number"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-24 sm:w-28"
              placeholder={field.label}
            />
            <span className="text-xs text-text-secondary">{field.label}</span>
          </div>
        ),
      )}
      {layout === "input-label" && typeof avgCost === "number" && (
        <div className="flex items-center gap-1">
          <span className="text-sm text-text-secondary">{t("estimatedMonthlyCost")}:</span>
          <span className="text-base font-bold font-mono">{formatDollar(avgCost, t)}</span>
          <span className="text-xs text-text-secondary">{t("perModelAvg")}</span>
        </div>
      )}
    </>
  );
});

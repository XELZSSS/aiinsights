import { ArrowLeftRight, Trash2, X } from "lucide-react";
import { Button } from "@/app/components/ui";
import { useTranslation } from "@/app/i18n";
import { modelId } from "@/shared/utils";
import type { ArtificialAnalysisModel } from "@/shared/types";

export function CompareChipBar({
  models,
  onRemove,
  onClear,
  onCompare,
  compareLabel,
}: {
  models: ArtificialAnalysisModel[];
  onRemove: (model: ArtificialAnalysisModel) => void;
  onClear: () => void;
  onCompare?: () => void;
  compareLabel?: string;
}) {
  const { t } = useTranslation();
  const canCompare = models.length >= 2;
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-between p-3 sm:p-4 rounded-lg border border-border bg-bg-secondary/50">
      <div className="flex flex-wrap gap-2 items-center">
        {models.map((model) => (
          <span
            key={modelId(model)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-card border border-border text-sm"
          >
            <span className="text-sm font-medium truncate max-w-[140px]">{model.short_name || model.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(model)}
              className="shrink-0 -mr-1"
              aria-label={`${t("remove")} ${model.short_name || model.name}`}
            >
              <X size={14} />
            </Button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button size="sm" variant="outline" onClick={onClear} className="flex-1 sm:flex-none">
          <Trash2 size={14} /> {t("clear")}
        </Button>
        {onCompare && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCompare}
            disabled={!canCompare}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeftRight size={14} /> {compareLabel ?? t("compareSelected")}
          </Button>
        )}
      </div>
      {onCompare && !canCompare && models.length > 0 && (
        <p className="text-xs text-text-secondary w-full">{t("compareLimit")}</p>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSearchStore } from "../../stores";
import { PRICING_BLENDS } from "../../../shared/config";
import type { ArtificialAnalysisModel } from "../../../shared/types";

export type ViewMode = "rankings" | "pricing" | "benchmarks";
export type ReasoningFilter = "all" | "reasoning" | "non-reasoning";

const REASONING_KEYWORDS = /\b(reasoning|thinking)\b/i;
const REASONING_PREFIXES = /^(o[134]|gpt-5)/i;

function isReasoningModel(model: ArtificialAnalysisModel) {
  return REASONING_KEYWORDS.test(model.name) || REASONING_PREFIXES.test(model.name);
}

function matchesSearch(model: ArtificialAnalysisModel, term: string): boolean {
  if (!term) return true;
  return model.name.toLowerCase().includes(term) || model.slug.toLowerCase().includes(term) || (model.model_creators?.name || "").toLowerCase().includes(term);
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

export function useAARankingFilters(rankings: ArtificialAnalysisModel[]) {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>((location.state as { viewMode?: ViewMode })?.viewMode ?? "rankings");
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
        if (p?.input == null && p?.output == null && p?.cache_hit == null && p?.blended?.[PRICING_BLENDS.INPUT_7_OUTPUT_2_1] == null) return false;
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

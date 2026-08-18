export interface ModelCreators {
  name?: string;
  color?: string;
}

export interface ModelPricing {
  input?: number | null;
  output?: number | null;
  cache_hit?: number | null;
}

export interface ModelSpeed {
  median_output_speed?: number | null;
}

export interface ModelCost {
  total?: number | null;
  input?: number | null;
  output?: number | null;
  reasoning?: number | null;
}

export interface ModelOmniscienceBreakdown {
  total?: {
    accuracy?: number | null;
    attempt_rate?: number | null;
    hallucination_rate?: number | null;
    omniscience?: number | null;
  };
}

export interface ArtificialAnalysisModel {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  model_creators?: ModelCreators;
  intelligence_index: number | null;
  release_date?: string | null;
  is_open_weights?: boolean;
  context_window_tokens?: number | null;
  blended_price?: number | null;
  cost?: ModelCost;
  coding_index?: number | null;
  agentic_index?: number | null;
  benchmarks?: Record<string, number | null>;
  pricing?: ModelPricing;
  speed?: ModelSpeed;
  input_modality_text?: boolean;
  input_modality_image?: boolean;
  input_modality_speech?: boolean;
  input_modality_video?: boolean;
  output_modality_text?: boolean;
  output_modality_image?: boolean;
  output_modality_speech?: boolean;
  output_modality_video?: boolean;
  omniscience_breakdown?: ModelOmniscienceBreakdown;
}

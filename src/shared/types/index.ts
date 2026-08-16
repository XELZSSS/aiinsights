export interface ArenaModel {
  model: string;
  score: number | null;
  votes: number | null;
  license: string | null;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  contextLength?: number | null;
}

export interface ArenaPayload {
  category: string;
  fetched_at: string;
  models: ArenaModel[];
}

export interface HallucinationRankingEntry {
  id: string;
  slug: string;
  model: string;
  hallucinationRate: number;
  accuracy: number;
  attemptRate: number;
  omniscienceIndex: number;
}

interface ModelCreators {
  name?: string;
  color?: string;
}

interface ModelPricing {
  input?: number | null;
  output?: number | null;
  cache_hit?: number | null;
  blended?: Record<string, number | null | undefined>;
  intelligence_index_cost?: {
    total_cost?: number | null;
  };
}

interface ModelSpeed {
  median_output_speed?: number | null;
}

interface ModelOmniscienceBreakdown {
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
  intelligence_index_is_estimated?: boolean;
  release_date?: string | null;
  is_open_weights?: boolean;
  context_window_tokens?: number | null;
  contextWindowFormatted?: string | null;
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

export interface OpenSourceModelEntry {
  id: string;
  author: string;
  downloads: number;
  likes: number;
  license: string;
  task: string | null;
  createdAt: string | null;
  lastModified: string | null;
  tags: string[];
}

export interface OpenRouterRankEntry {
  rank: number;
  id: string;
  name: string;
  creator: string;
  category: "coding" | "reasoning" | "general";
  variant?: string;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  requestCount?: number;
  imageOutputRequests?: number;
  videoOutputSeconds?: number;
  change?: number | null;
  pricing?: {
    prompt: number;
    completion: number;
  };
  isFree?: boolean;
}

export interface OpenRouterRankingsPayload {
  tokenUsageRankings: OpenRouterRankEntry[];
  fetchedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export type ThemeMode = "light" | "dark";

export interface HomeDashboardData {
  orRankings: OpenRouterRankingsPayload | null;
  arena: ArenaPayload | null;
  opensource: OpenSourceModelEntry[] | null;
}

export interface SearchResult {
  id: string;
  name: string;
  source: string;
  score: number | null;
  provider: string | null;
  link: string;
}
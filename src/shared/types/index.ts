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

export interface ModelCreators {
  name?: string;
  color?: string;
}

export interface ModelPricing {
  input?: number | null;
  output?: number | null;
  cache_hit?: number | null;
  blended?: Record<string, number | null | undefined>;
  intelligence_index_cost?: {
    total_cost?: number | null;
  };
}

export interface ModelSpeed {
  median_output_speed?: number | null;
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

export interface TtsModel {
  id: string;
  name: string;
  provider: string | null;
  quality_elo: number | null;
  speed_chars_per_sec: number | null;
  price_per_1m_chars: number | null;
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

export interface OpenRouterAppEntry {
  rank: number;
  id: string;
  name: string;
  description?: string;
  url?: string | null;
  categories: string[];
  totalTokens: number;
  requestCount: number;
}

export interface OpenRouterRankingsPayload {
  tokenUsageRankings: OpenRouterRankEntry[];
  appUsageRankings: OpenRouterAppEntry[];
  fetchedAt: string;
}

export interface ModelPrediction {
  id: string;
  question: string;
  company: string;
  probability: number;
  volume: number;
  deadline: string;
  url: string;
}

export interface ReleasePrediction {
  id: string;
  question: string;
  model: string;
  predictions: { window: string; probability: number }[];
  volume: number;
  url: string;
}

export interface ProviderPrediction {
  id: string;
  question: string;
  provider: string;
  options: { label: string; probability: number }[];
  volume: number;
  deadline: string;
  url: string;
}

export interface PredictionsPayload {
  modelRankings: ModelPrediction[];
  releases: ReleasePrediction[];
  providers: ProviderPrediction[];
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export type NewsCategory = "industry" | "opensource" | "hardware" | "funding";

export interface HealthEntry {
  name: string;
  status: "ok" | "error";
  detail: string;
  responseTime: number;
  statusCode: number | null;
  url: string;
}

export interface SystemStats {
  runtime: "cloudflare" | "standard";
  uptime: number;
}

export type ThemeMode = "light" | "dark";

export interface HomeDashboardData {
  orRankings: OpenRouterRankingsPayload | null;
  arena: ArenaPayload | null;
  opensource: OpenSourceModelEntry[] | null;
  tts: TtsModel[] | null;
  predictions: PredictionsPayload | null;
}

export interface SearchResult {
  id: string;
  name: string;
  source: string;
  score: number | null;
  provider: string | null;
  link: string;
}
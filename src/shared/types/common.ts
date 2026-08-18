import type { ArenaPayload } from "./arena";
import type { OpenSourceModelEntry } from "./huggingface";
import type { OpenRouterRankingsPayload } from "./openrouter";

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

export interface SourceStatus {
  id: "arena" | "artificialAnalysis" | "huggingface" | "openrouter" | "news";
  name: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface SourcesStatusPayload {
  sources: SourceStatus[];
  checkedAt: string;
  firstLaunchAt: string;
  uptimeMs: number;
}

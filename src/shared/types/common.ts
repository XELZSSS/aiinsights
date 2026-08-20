import type { ArenaPayload } from "./arena";
import type { OpenSourceModelEntry } from "./huggingface";
import type { OpenRouterRankingsPayload } from "./openrouter";

/** UI color theme, persisted in localStorage. */
export type ThemeMode = "light" | "dark";

/** Combined data served for the home dashboard. */
export interface HomeDashboardData {
  orRankings: OpenRouterRankingsPayload | null;
  arena: ArenaPayload | null;
  opensource: OpenSourceModelEntry[] | null;
}

/** A model match returned by cross-source search. */
export interface SearchResult {
  id: string;
  name: string;
  source: string;
  score: number | null;
  provider: string | null;
  link: string;
}

/** Health-check result for one upstream data source. */
export interface SourceStatus {
  id: "arena" | "artificialAnalysis" | "huggingface" | "openrouter" | "news";
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

/** Aggregate health-check payload across all sources; uptimeMs tracks service uptime since firstLaunchAt. */
export interface SourcesStatusPayload {
  sources: SourceStatus[];
  checkedAt: string;
  firstLaunchAt: string;
  uptimeMs: number;
}

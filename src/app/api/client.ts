import { apiBase } from "@/shared/config";

const FETCH_TIMEOUT_MS = 30_000;

export interface QueryCtx {
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = apiBase && path.startsWith("/") ? apiBase + path : path;
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const merged = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: merged,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return ((await res.json()) as { data: T }).data;
}

export const apiPaths = {
  artificialIndex: "/api/artificial-analysis-index",
  openSourceModels: (sort = "trendingScore", direction = "-1", limit = 500) =>
    `/api/open-source-models?sort=${sort}&direction=${direction}&limit=${limit}`,
  openSourceReleases: "/api/open-source-releases",
  openRouterRankings: "/api/openrouter-rankings",
  news: (category: string) => `/api/news?category=${encodeURIComponent(category)}`,
  homeDashboard: "/api/home-dashboard",
} as const;

export const fetcher =
  <T>(path: string) =>
  ({ signal }: QueryCtx) =>
    apiFetch<T>(path, signal);

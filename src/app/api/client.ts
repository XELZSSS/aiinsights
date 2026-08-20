// Give analysis endpoints ample time; the timeout races the caller's own AbortSignal.
const FETCH_TIMEOUT_MS = 90_000;

// Strip trailing slashes so apiBase can be safely concatenated with "/api/..." paths.
const apiBase = import.meta.env?.VITE_API_BASE?.replace(/\/+$/, "") ?? "";

export interface QueryCtx {
  signal?: AbortSignal;
}

/** GET `path` (apiBase-prefixed when relative) and unwrap the server's `{ data }` envelope. */
export async function apiFetch<T>(path: string, signal?: AbortSignal, opts?: { cache?: RequestCache }): Promise<T> {
  const url = apiBase && path.startsWith("/") ? apiBase + path : path;
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  // Abort on whichever fires first: the caller's signal or the hard timeout.
  const merged = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: merged,
    cache: opts?.cache,
  });
  if (!res.ok) {
    // Prefer the API's structured error message when present, else fall back to the status line.
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return ((await res.json()) as { data: T }).data;
}

export const apiPaths = {
  artificialIndex: "/api/artificial-analysis-index",
  // The open-source list is paginated server-side; defaults to trending, descending order.
  openSourceModels: (sort = "trendingScore", direction = "-1", limit = 500) =>
    `/api/open-source-models?sort=${sort}&direction=${direction}&limit=${limit}`,
  openSourceReleases: "/api/open-source-releases",
  openRouterRankings: "/api/openrouter-rankings",
  sourcesStatus: "/api/sources-status",
  news: (category: string) => `/api/news?category=${encodeURIComponent(category)}`,
  homeDashboard: "/api/home-dashboard",
} as const;

export const fetcher =
  <T>(path: string) =>
  ({ signal }: QueryCtx) =>
    apiFetch<T>(path, signal);

import { USER_AGENT } from "@/shared/config";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

export interface FetchOptions extends RequestInit {
  retries?: number;
  timeoutMs?: number;
}

/** Result of a lightweight availability probe: headers only, body cancelled. */
export interface ProbeResult {
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
}

/** Transient upstream failure (5xx / 429 / network) that is worth retrying. */
class RetryableHttpError extends Error {
  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.name = "RetryableHttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Exponential backoff with jitter to spread retries across concurrent requests.
function backoffDelayMs(attempt: number): number {
  return BASE_DELAY_MS * (1 << attempt) + Math.random() * BASE_DELAY_MS;
}

function isRetryableError(e: unknown): boolean {
  // TypeError covers network failures; DOMException TimeoutError covers AbortSignal.timeout expiry.
  if (e instanceof RetryableHttpError) return true;
  if (e instanceof TypeError) return true;
  if (e instanceof DOMException) return e.name === "TimeoutError";
  return false;
}

interface AttemptContext {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal | undefined;
  accept: string;
}

/**
 * Perform a single fetch attempt. Non-ok responses throw: permanent for client
 * errors except rate-limiting, retryable for everything else.
 */
async function attemptOnce({ url, headers, signal, accept }: AttemptContext): Promise<Response> {
  const res = await fetch(url, { headers, signal });
  if (res.ok) return res;
  // 4xx (except rate-limit 429) reflects a bad request, not a transient failure, so capture the body and bail.
  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
    const body = accept.includes("json") ? await res.text().catch(() => "") : "";
    throw new Error(`HTTP ${res.status} for ${url}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  throw new RetryableHttpError(res.status, url);
}

/** Combine the caller's signal (if any) with a per-attempt timeout. */
function linkSignals(external: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timeoutSignal]) : timeoutSignal;
}

export class HttpClient {
  private userAgent: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(opts?: { userAgent?: string; timeoutMs?: number; maxRetries?: number }) {
    this.userAgent = opts?.userAgent ?? USER_AGENT;
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private async doFetch(url: string, init: FetchOptions, accept: string): Promise<Response> {
    const { retries = this.maxRetries, timeoutMs = this.timeoutMs, ...rest } = init;
    const headers: Record<string, string> = {
      "user-agent": this.userAgent,
      "accept-encoding": "gzip, deflate, br",
      accept,
      ...(rest.headers as Record<string, string> | undefined),
    };
    const ctx: AttemptContext = { url, headers, accept, signal: undefined };

    let lastErr: unknown;
    // Retry transient failures with exponential backoff; client errors (except 429) are treated as permanent.
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        ctx.signal = linkSignals(rest.signal, timeoutMs);
        return await attemptOnce(ctx);
      } catch (e) {
        lastErr = e;
        if (!isRetryableError(e)) throw e;
        if (attempt < retries) await sleep(backoffDelayMs(attempt));
      }
    }
    throw lastErr;
  }

  async json<T>(url: string, init?: FetchOptions): Promise<T> {
    return (await this.doFetch(url, init ?? {}, "application/json")).json() as Promise<T>;
  }

  async text(url: string, init?: FetchOptions): Promise<string> {
    return (await this.doFetch(url, init ?? {}, "text/html,application/xhtml+xml,*/*")).text();
  }

  async probe(url: string, timeoutMs = 8_000): Promise<ProbeResult> {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "user-agent": this.userAgent },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const latencyMs = Date.now() - started;
      // Cancel the body early so we only pay for headers, not the full payload.
      res.body?.cancel().catch(() => {});
      return { ok: res.ok, status: res.status, latencyMs, error: res.ok ? null : `HTTP ${res.status}` };
    } catch (e) {
      const latencyMs = Date.now() - started;
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      return { ok: false, status: null, latencyMs, error: timedOut ? "timeout" : "network error" };
    }
  }
}

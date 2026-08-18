import { USER_AGENT } from "@/shared/config";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

interface FetchOptions extends RequestInit {
  retries?: number;
  timeoutMs?: number;
}

class RetryableHttpError extends Error {
  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.name = "RetryableHttpError";
  }
}

function isRetryableError(e: unknown): boolean {
  if (e instanceof RetryableHttpError) return true;
  if (e instanceof TypeError) return true;
  if (e instanceof DOMException) return e.name === "TimeoutError";
  return false;
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
    const externalSignal = rest.signal;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
        const res = await fetch(url, { headers, signal });
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            const body = accept.includes("json") ? await res.text().catch(() => "") : "";
            throw new Error(`HTTP ${res.status} for ${url}${body ? `: ${body.slice(0, 200)}` : ""}`);
          }
          throw new RetryableHttpError(res.status, url);
        }
        return res;
      } catch (e) {
        lastErr = e;
        if (!isRetryableError(e)) throw e;
        if (attempt < retries) {
          const delay = BASE_DELAY_MS * (1 << attempt) + Math.random() * BASE_DELAY_MS;
          await new Promise((r) => setTimeout(r, delay));
        }
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
}

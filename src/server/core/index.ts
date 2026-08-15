export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

import { USER_AGENT } from "../../shared/config";

export class ValidationError extends ApiError {
  constructor(msg: string) {
    super(msg, 400);
    this.name = "ValidationError";
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
export type QuerySpec =
  | { type: "string"; default?: string; maxLen?: number }
  | { type: "number"; default?: string; min?: number; max?: number }
  | { type: "enum"; values: readonly string[]; default?: string }
  | { type: "boolean"; default?: string };

export type QuerySchema = Record<string, QuerySpec>;

export function validateQuery(raw: Record<string, string>, schema: QuerySchema): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, spec] of Object.entries(schema)) {
    const rawValue = raw[name] ?? spec.default;
    if (rawValue === undefined) continue;
    switch (spec.type) {
      case "string": {
        let value = rawValue;
        if (spec.maxLen != null && value.length > spec.maxLen) {
          throw new ValidationError(`Query param "${name}" exceeds max length ${spec.maxLen}`);
        }
        out[name] = value;
        break;
      }
      case "number": {
        const n = Number(rawValue);
        if (!Number.isFinite(n)) throw new ValidationError(`Query param "${name}" must be a number`);
        if (spec.min != null && n < spec.min) throw new ValidationError(`Query param "${name}" must be >= ${spec.min}`);
        if (spec.max != null && n > spec.max) throw new ValidationError(`Query param "${name}" must be <= ${spec.max}`);
        out[name] = String(n);
        break;
      }
      case "enum": {
        if (!spec.values.includes(rawValue)) {
          throw new ValidationError(`Query param "${name}" must be one of: ${spec.values.join(", ")}`);
        }
        out[name] = rawValue;
        break;
      }
      case "boolean": {
        if (rawValue !== "true" && rawValue !== "false") {
          throw new ValidationError(`Query param "${name}" must be "true" or "false"`);
        }
        out[name] = rawValue;
        break;
      }
    }
  }
  return out;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

export interface FetchOptions extends RequestInit {
  retries?: number;
  timeoutMs?: number;
}

class RetryableHttpError extends Error {
  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.name = "RetryableHttpError";
  }
}

// Network-level failures (DNS/connection refused) surface as TypeError and
// request timeouts as DOMException "TimeoutError" — both are transient and
// worth retrying. Explicit caller aborts ("AbortError") are not.
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

  async probe(url: string, timeoutMs: number): Promise<{ responseTime: number; statusCode: number }> {
    const start = Date.now();
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": this.userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseTime = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { responseTime, statusCode: res.status };
  }
}


export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

const MAX_ENTRIES = 500;

class MemoryBackend implements CacheBackend {
  private store = new Map<string, { data: unknown; expires: number }>();
  private writes = 0;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { data: value, expires: Date.now() + ttlMs });
    if (++this.writes >= 200) {
      this.writes = 0;
      this.evict();
    }
  }

  private evict() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expires <= now) this.store.delete(k);
    }
    if (this.store.size > MAX_ENTRIES) {
      const entries = [...this.store.entries()].sort((a, b) => a[1].expires - b[1].expires);
      const toDelete = this.store.size - MAX_ENTRIES;
      for (let i = 0; i < toDelete && i < entries.length; i++) {
        const key = entries[i]?.[0];
        if (key) this.store.delete(key);
      }
    }
  }
}

class KvBackend implements CacheBackend {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key, { type: "text", cacheTtl: 30 });
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)) });
  }
}

const NEG_TTL_MS = 5_000;
const MAX_NEG_KEYS = 100;

export class CacheService {
  private backend: CacheBackend;
  private version: string;
  private inflight = new Map<string, Promise<unknown>>();
  private negCache = new Map<string, { ts: number; err: unknown }>();

  constructor(opts: { kv?: KVNamespace | null; version?: string }) {
    this.backend = opts.kv ? new KvBackend(opts.kv) : new MemoryBackend();
    this.version = opts.version ?? "v1";
  }

  private versionedKey(key: string): string {
    return `${this.version}:${key}`;
  }

  private negCachedErr(key: string): unknown | null {
    const entry = this.negCache.get(key);
    if (entry === undefined) return null;
    if (Date.now() - entry.ts > NEG_TTL_MS) {
      this.negCache.delete(key);
      return null;
    }
    return entry.err;
  }

  private addNegKey(key: string, err: unknown) {
    if (this.negCache.size >= MAX_NEG_KEYS) this.negCache.clear();
    this.negCache.set(key, { ts: Date.now(), err });
  }

  async get<T>(key: string): Promise<T | null> {
    return this.backend.get<T>(this.versionedKey(key));
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    return this.backend.set(this.versionedKey(key), value, ttlMs);
  }

  async withTtl<T>(key: string, defaultTtl: number, fn: () => Promise<{ data: T; ttl?: number }>): Promise<T> {
    const vKey = this.versionedKey(key);
    const cached = await this.backend.get<T>(vKey);
    if (cached !== null) return cached;

    const negErr = this.negCachedErr(vKey);
    if (negErr !== null) throw negErr;

    const existing = this.inflight.get(vKey) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      try {
        const { data, ttl } = await fn();
        await this.backend.set(vKey, data, ttl ?? defaultTtl);
        return data;
      } catch (err) {
        this.addNegKey(vKey, err);
        throw err;
      }
    })().finally(() => this.inflight.delete(vKey));

    this.inflight.set(vKey, promise);
    return promise;
  }
}

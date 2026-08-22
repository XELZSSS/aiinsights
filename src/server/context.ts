import { CacheService } from "@/server/core/cache";
import { HttpClient } from "@/server/core/http";
import { CACHE_VERSION } from "@/shared/config";

/** Cloudflare Worker bindings: optional KV namespace and a static-assets fetcher for non-API routes. */
export interface Env {
  METRICS?: KVNamespace;
  ASSETS?: Fetcher;
}

/** Severity levels accepted by the context logger. */
type LogLevel = "info" | "warn" | "error";

/** Dependency container handed to every route handler and data source. */
export interface AppContext {
  cache: CacheService;
  http: HttpClient;
  kv: KVNamespace | null;
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void;
}

/** Structured console logger shared by every request in the isolate. */
export function createLogger(): AppContext["log"] {
  return (level, msg, meta) => {
    const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
    if (level === "error") console.error(`[${level}] ${line}`);
    else if (level === "warn") console.warn(`[${level}] ${line}`);
    else console.log(`[${level}] ${line}`);
  };
}

// Reuse the HTTP client and cache across warmup and request paths within the same isolate.
let sharedHttp: HttpClient | null = null;
let sharedCache: CacheService | null = null;

/** Build the per-request context, wiring in the optional KV backend for the cache. */
export function buildContext(env: Env): AppContext {
  sharedHttp ??= new HttpClient();
  sharedCache ??= new CacheService({ kv: env.METRICS ?? null, version: CACHE_VERSION });
  return {
    cache: sharedCache,
    http: sharedHttp,
    kv: env.METRICS ?? null,
    log: createLogger(),
  };
}

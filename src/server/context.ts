import { CacheService } from "./core";
import { HttpClient } from "./core";

export interface Env {
  METRICS?: KVNamespace;
  CACHE_VERSION?: string;
  ASSETS?: Fetcher;
}

export interface AppContext {
  env: Env;
  cache: CacheService;
  http: HttpClient;
  version: string;
  now(): number;
  log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>): void;
}

// Shared per-isolate instances: without KV the cache falls back to an
// in-memory backend, and creating a fresh instance per request made it
// (plus the in-flight dedup and negative cache) useless.
let sharedHttp: HttpClient | null = null;
let sharedCache: CacheService | null = null;
let sharedCacheVersion: string | null = null;

export function buildContext(env: Env): AppContext {
  const version = env.CACHE_VERSION ?? "v1";
  sharedHttp ??= new HttpClient();
  // Rebuild the cache when the deploy version changes (keep_vars=true can
  // update CACHE_VERSION without a redeploy); a stale version would keep
  // serving keys that no longer match the current schema.
  if (!sharedCache || sharedCacheVersion !== version) {
    sharedCache = new CacheService({ kv: env.METRICS ?? null, version });
    sharedCacheVersion = version;
  }
  return {
    env,
    cache: sharedCache,
    http: sharedHttp,
    version,
    now: () => Date.now(),
    log: (level, msg, meta) => {
      const line = meta ? `${msg} ${JSON.stringify(meta)}` : msg;
      if (level === "error") console.error(`[${level}] ${line}`);
      else if (level === "warn") console.warn(`[${level}] ${line}`);
      else console.log(`[${level}] ${line}`);
    },
  };
}

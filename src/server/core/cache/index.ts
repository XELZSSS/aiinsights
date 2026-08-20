import type { CacheBackend } from "./backends";
import { MemoryBackend, KvBackend } from "./backends";

export type { CacheBackend } from "./backends";

/** TTL cache fronting a backend (memory or KV); keys are namespaced by a version so a schema change can invalidate all entries. */
export class CacheService {
  private backend: CacheBackend;
  private version: string;
  private inflight = new Map<string, Promise<unknown>>();

  constructor(opts: { kv?: KVNamespace | null; version?: string }) {
    this.backend = opts.kv ? new KvBackend(opts.kv) : new MemoryBackend();
    this.version = opts.version ?? "v1";
  }

  private versionedKey(key: string): string {
    return `${this.version}:${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.backend.get<T>(this.versionedKey(key));
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    return this.backend.set(this.versionedKey(key), value, ttlMs);
  }

  async withTtl<T>(key: string, defaultTtl: number, fn: () => Promise<{ data: T; ttl?: number }>): Promise<T> {
    const vKey = this.versionedKey(key);
    const cached = await this.backend.get<T>(vKey);
    if (cached !== undefined) return cached;

    // Coalesce concurrent misses for the same key into a single upstream fetch.
    const existing = this.inflight.get(vKey) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      try {
        const { data, ttl } = await fn();
        await this.backend.set(vKey, data, ttl ?? defaultTtl);
        return data;
      } finally {
        this.inflight.delete(vKey);
      }
    })();

    this.inflight.set(vKey, promise);
    return promise;
  }
}

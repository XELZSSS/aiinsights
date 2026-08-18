interface CacheBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

const MAX_ENTRIES = 500;

class MemoryBackend implements CacheBackend {
  private store = new Map<string, { data: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.delete(key);
    this.store.set(key, { data: value, expires: Date.now() + ttlMs });
    if (this.store.size > MAX_ENTRIES) this.evict();
  }

  private evict() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expires <= now) this.store.delete(k);
    }
    let overflow = this.store.size - MAX_ENTRIES;
    for (const k of this.store.keys()) {
      if (overflow <= 0) break;
      this.store.delete(k);
      overflow--;
    }
  }
}

class KvBackend implements CacheBackend {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.kv.get(key, { type: "text", cacheTtl: 30 });
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)) });
  }
}

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

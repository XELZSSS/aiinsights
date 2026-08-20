/** Pluggable key/value store with per-entry TTLs. */
export interface CacheBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

const MAX_ENTRIES = 500;

export class MemoryBackend implements CacheBackend {
  private store = new Map<string, { data: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Re-insert on read so the entry's position reflects recency (approximate LRU).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.delete(key);
    this.store.set(key, { data: value, expires: Date.now() + ttlMs });
    if (this.store.size > MAX_ENTRIES) this.evict();
  }

  // Drop expired entries first, then oldest by insertion order until back under capacity.
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

export class KvBackend implements CacheBackend {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | undefined> {
    // cacheTtl keeps hot keys in KV's edge cache; values are stored as JSON strings.
    const raw = await this.kv.get(key, { type: "text", cacheTtl: 30 });
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // KV enforces a 60s minimum TTL, so clamp short-lived values up to it.
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)) });
  }
}

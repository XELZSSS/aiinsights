import { describe, expect, it, vi } from "vitest";
import { CacheService } from "@/server/core/cache";

describe("CacheService (memory backend)", () => {
  it("returns cached values", async () => {
    const cache = new CacheService({});
    const fn = vi.fn(async () => ({ data: "value" }));
    expect(await cache.withTtl("k", 60_000, fn)).toBe("value");
    expect(await cache.withTtl("k", 60_000, fn)).toBe("value");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("re-executes after TTL expires", async () => {
    vi.useFakeTimers();
    try {
      const cache = new CacheService({});
      const fn = vi.fn(async () => ({ data: 1 }));
      await cache.withTtl("k", 1_000, fn);
      await vi.advanceTimersByTimeAsync(2_000);
      await cache.withTtl("k", 1_000, fn);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("coalesces concurrent fetches for the same key", async () => {
    const cache = new CacheService({});
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return { data: "v" };
    });
    const [a, b] = await Promise.all([cache.withTtl("same", 60_000, fn), cache.withTtl("same", 60_000, fn)]);
    expect(a).toBe("v");
    expect(b).toBe("v");
    expect(calls).toBe(1);
  });

  it("evicts least-recently-used entries when over capacity", async () => {
    const cache = new CacheService({});
    const fn = vi.fn(async () => ({ data: 1 }));
    const keys = Array.from({ length: 501 }, (_, i) => `key-${i}`);
    for (const k of keys) await cache.withTtl(k, 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(501);

    await cache.withTtl("key-0", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(502);

    await cache.withTtl("key-1", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(503);
  });

  it("versions keys separately", async () => {
    const cache = new CacheService({ version: "v2" });
    const fn = vi.fn(async () => ({ data: 1 }));
    await cache.withTtl("k", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

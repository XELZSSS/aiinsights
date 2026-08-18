import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import { CacheService } from "@/server/core/cache";

describe("CacheService (KV backend in workerd)", () => {
  beforeEach(async () => {
    await reset();
  });

  it("persists values through the real KV binding", async () => {
    const cache = new CacheService({ kv: env.METRICS, version: "v1" });
    const fn = vi.fn(async () => ({ data: { a: 1 } }));

    expect(await cache.withTtl("kv-int", 60_000, fn)).toEqual({ a: 1 });
    expect(await cache.withTtl("kv-int", 60_000, fn)).toEqual({ a: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stores values under versioned keys in KV", async () => {
    const v1 = new CacheService({ kv: env.METRICS, version: "v1" });
    const v2 = new CacheService({ kv: env.METRICS, version: "v2" });
    const fn = vi.fn(async () => ({ data: "x" }));

    await v1.withTtl("shared", 60_000, fn);
    await v2.withTtl("shared", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(2);

    await v1.withTtl("shared", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("is isolated per test file via the KV namespace reset", async () => {
    const cache = new CacheService({ kv: env.METRICS, version: "v1" });
    expect(await cache.get("kv-int")).toBeUndefined();
  });
});
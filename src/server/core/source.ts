import type { AppContext } from "@/server/context";

interface SourceResult<Data> {
  data: Data;
  ttl?: number;
}

type SourceFn<Params, Data> = (ctx: AppContext, params: Params) => Promise<Data>;

/** Wrap a data fetcher so results are cached with a default TTL; the fetcher may return a shorter per-result ttl. */
export function createSource<Params, Data>(opts: {
  cacheKey: (params: Params) => string;
  defaultTtl: number;
  fetch: (ctx: AppContext, params: Params) => Promise<SourceResult<Data>>;
}): SourceFn<Params, Data> {
  return (ctx, params) => ctx.cache.withTtl(opts.cacheKey(params), opts.defaultTtl, () => opts.fetch(ctx, params));
}

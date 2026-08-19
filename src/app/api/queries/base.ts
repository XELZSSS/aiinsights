import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetcher, type QueryCtx } from "@/app/api/client";

export interface ApiQueryOptions<T> {
  staleTime?: number;
  refetchInterval?: number | false;
  queryFn?: (ctx: QueryCtx) => Promise<T>;
}

export function createApiQuery<T>(
  key: readonly (string | number)[],
  path: string,
  opts?: ApiQueryOptions<T>,
) {
  const { queryFn, ...queryOpts } = opts ?? {};
  const qf = queryFn ?? fetcher<T>(path);
  return {
    use: (enabled = true) => useQuery<T>({ queryKey: key, queryFn: qf, ...queryOpts, enabled }),
    useSuspense: () => useSuspenseQuery<T>({ queryKey: key, queryFn: qf, ...queryOpts }),
  };
}

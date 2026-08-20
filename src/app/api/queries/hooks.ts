import { useCallback, useMemo, useState } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch, apiPaths } from "@/app/api/client";
import type { OpenSourceModelEntry, SourcesStatusPayload } from "@/shared/types";
import { qSourcesStatus, qOpenSourceModels, qOpenSourceReleases } from "./definitions";

export type SourcesStatusQuery = UseQueryResult<SourcesStatusPayload> & {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

/** sources-status query extended with an explicit `refresh()` that bypasses the cache and `isRefreshing` state. */
export function useSourcesStatus(): SourcesStatusQuery {
  const queryClient = useQueryClient();
  const query = qSourcesStatus.use();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await apiFetch<SourcesStatusPayload>(`${apiPaths.sourcesStatus}?refresh=1`, undefined, {
        cache: "no-store",
      });
      // Write the fresh payload straight into the cache so all consumers update without a refetch.
      queryClient.setQueryData(["api", "sources-status"], fresh);
    } catch {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, query.refetch]);

  return { ...query, isRefreshing, refresh };
}

export interface OpenSourceModelsQuery {
  data: OpenSourceModelEntry[];
  isPending: boolean;
  isError: boolean;
}

/** Merges trending and release lists, de-duplicating by model id so each model appears once. */
export function useAllOpenSourceModels(enabled = true): OpenSourceModelsQuery {
  const trending = qOpenSourceModels.use(enabled);
  const releases = qOpenSourceReleases.use(enabled);

  const data = useMemo(() => {
    const seen = new Set<string>();
    return [...(trending.data ?? []), ...(releases.data ?? [])].filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [trending.data, releases.data]);

  return {
    data,
    isPending: enabled && (trending.isPending || releases.isPending),
    isError: enabled && (trending.isError || releases.isError),
  };
}

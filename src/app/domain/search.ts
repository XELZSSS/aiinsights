import { useDeferredValue, useMemo } from "react";
import { useArtificialRankings, useOpenRouterRankings, useAllOpenSourceModels } from "@/app/api/queries";
import { useHallucinationRankings } from "@/app/domain/hallucination";
import { modelDetailPath } from "@/shared/utils";
import type { SearchResult } from "@/shared/types";

interface SearchIndex<T> {
  fields: string[][];
  items: T[];
}

// Pre-normalize each item's fields once (lowercased/trimmed) so matching is cheap and case-insensitive.
function buildIndex<T>(data: T[], fields: (item: T) => (string | undefined | null)[]): SearchIndex<T> | null {
  if (data.length === 0) return null;
  return {
    items: data,
    fields: data.map((item) => fields(item).map((f) => (f ? f.toLowerCase().trim() : ""))),
  };
}

// Scoring: exact match = 4, prefix = 3, substring = 2; higher scores sort earlier in results.
export function matchTerm(fields: string[], term: string): { matched: boolean; score: number } {
  for (const f of fields) {
    if (!f) continue;
    if (f === term) return { matched: true, score: 4 };
  }
  let best = 0;
  for (const f of fields) {
    if (!f) continue;
    if (f.startsWith(term)) best = Math.max(best, 3);
    else if (f.includes(term)) best = Math.max(best, 2);
  }
  return { matched: best > 0, score: best };
}

interface Collected {
  result: SearchResult;
  match: number;
  itemScore: number;
}

function collect<T>(
  index: SearchIndex<T> | null,
  term: string,
  mapResult: (item: T) => SearchResult,
  out: Collected[],
): void {
  if (!index) return;
  for (let i = 0; i < index.items.length; i++) {
    const { matched, score } = matchTerm(index.fields[i]!, term);
    if (!matched) continue;
    const result = mapResult(index.items[i]!);
    out.push({ result, match: score, itemScore: result.score ?? -Infinity });
  }
}

export interface SearchState {
  results: SearchResult[];
  isPending: boolean;
  isError: boolean;
}

/** Searches all ranking datasets (artificial index, open-router, open-source, hallucination) for `searchTerm`. */
export function useSearchAllRankings(searchTerm: string): SearchState {
  // Only query once the term is at least 2 chars to avoid noisy partial searches.
  const enabled = searchTerm.length >= 2;
  const artificialQ = useArtificialRankings(enabled);
  const openSourceQ = useAllOpenSourceModels(enabled);
  const orQ = useOpenRouterRankings(enabled);

  const artificialData = artificialQ.data ?? [];
  const openSourceRankings = openSourceQ.data;
  const openRouterData = orQ.data?.tokenUsageRankings ?? [];
  const hallucinationRankings = useHallucinationRankings(artificialData, enabled);

  const artificialIndex = useMemo(
    () => buildIndex(artificialData, (m) => [m.name, m.slug, m.short_name, m.model_creators?.name]),
    [artificialData],
  );
  const openRouterIndex = useMemo(() => buildIndex(openRouterData, (m) => [m.name, m.id, m.creator]), [openRouterData]);
  const openSourceIndex = useMemo(() => buildIndex(openSourceRankings, (m) => [m.id, m.author]), [openSourceRankings]);
  const hallucinationIndex = useMemo(
    () => buildIndex(hallucinationRankings, (m) => [m.model, m.slug, m.id]),
    [hallucinationRankings],
  );

  // Defer the term so rapid keystrokes don't rebuild every search index on each frame.
  const deferredTerm = useDeferredValue(searchTerm);

  const results = useMemo(() => {
    if (!enabled) return [];
    const term = deferredTerm.toLowerCase();
    const collected: Collected[] = [];
    collect(
      artificialIndex,
      term,
      (m) => ({
        id: m.id,
        name: m.name,
        source: "modelRankings",
        score: m.intelligence_index,
        provider: m.model_creators?.name || null,
        link: modelDetailPath("aa", m.slug || m.id),
      }),
      collected,
    );
    collect(
      openRouterIndex,
      term,
      (m) => ({
        id: m.id,
        name: m.name,
        source: "openRouterRankings",
        score: null,
        provider: m.creator || null,
        link: modelDetailPath("or", m.id),
      }),
      collected,
    );
    collect(
      openSourceIndex,
      term,
      (m) => ({
        id: m.id,
        name: m.id,
        source: "openSourceRankings",
        score: null,
        provider: m.author || null,
        link: modelDetailPath("os", m.id),
      }),
      collected,
    );
    collect(
      hallucinationIndex,
      term,
      (m) => ({
        id: m.id,
        name: m.model,
        source: "hallucinationRankings",
        score: m.omniscienceIndex,
        provider: null,
        link: modelDetailPath("hall", m.slug || m.id),
      }),
      collected,
    );
    // Rank by match quality first, then the model's own score, and cap the list at 20 hits.
    return collected
      .sort((a, b) => b.match - a.match || b.itemScore - a.itemScore)
      .map((c) => c.result)
      .slice(0, 20);
  }, [enabled, deferredTerm, artificialIndex, openRouterIndex, openSourceIndex, hallucinationIndex]);

  return {
    results,
    isPending: enabled && (artificialQ.isPending || openSourceQ.isPending || orQ.isPending),
    isError: enabled && (artificialQ.isError || openSourceQ.isError || orQ.isError),
  };
}

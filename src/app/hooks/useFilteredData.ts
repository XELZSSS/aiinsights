import { useRef, useMemo } from "react";
import { useSearchStore } from "@/app/stores";
import { matchTerm } from "@/app/domain/search";

/** Filters `data` by the global search term, scoring matches via the domain `matchTerm` helper. */
export function useFilteredData<T>(data: T[], getSearchFields: (item: T) => string[]): T[] {
  const searchTerm = useSearchStore((s) => s.searchTerm);
  // Hold the accessor in a ref so the memoized filter isn't invalidated by its identity.
  const fieldsRef = useRef(getSearchFields);
  fieldsRef.current = getSearchFields;
  return useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data;
    const fields = fieldsRef.current;
    return data.filter(
      (item) =>
        matchTerm(
          fields(item).map((f) => f.toLowerCase().trim()),
          term,
        ).matched,
    );
  }, [data, searchTerm]);
}

import { useRef, useMemo } from "react";
import { useSearchStore } from "@/app/stores";
import { matchTerm } from "@/app/domain/search";

export function useFilteredData<T>(data: T[], getSearchFields: (item: T) => string[]): T[] {
  const searchTerm = useSearchStore((s) => s.searchTerm);
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

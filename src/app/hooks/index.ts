import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
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

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export function useSearchResetOnNavigate() {
  const location = useLocation();
  const resetSearch = useSearchStore((s) => s.resetSearch);

  useEffect(() => {
    resetSearch();
  }, [location.pathname, resetSearch]);
}

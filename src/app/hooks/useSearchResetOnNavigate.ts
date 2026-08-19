import { useEffect } from "react";
import { useLocation } from "react-router";
import { useSearchStore } from "@/app/stores";

export function useSearchResetOnNavigate() {
  const location = useLocation();
  const resetSearch = useSearchStore((s) => s.resetSearch);

  useEffect(() => {
    resetSearch();
  }, [location.pathname, resetSearch]);
}

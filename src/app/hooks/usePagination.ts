import { useCallback, useState } from "react";

export function usePagination<T>(data: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = data.length > pageSize ? data.slice((safePage - 1) * pageSize, safePage * pageSize) : data;

  const goToPage = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);

  return { page: safePage, totalPages, pagedData, goToPage } as const;
}

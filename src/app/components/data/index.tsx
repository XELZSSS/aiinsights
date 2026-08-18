import { memo, Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useIsMobile } from "@/app/hooks";
import { cn } from "@/shared/utils";
import { Pagination } from "@/app/components/ui";

export interface DataTableColumn<T> {
  id: string;
  header?: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  hiddenMd?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (row: T) => string;
  pageSize?: number;
  expandedRowId?: string | null;
  onToggleExpand?: (rowId: string | null) => void;
  renderExpandedRow?: (row: T) => ReactNode;
}

function useTablePagination<T>(data: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = data.length > pageSize ? data.slice((safePage - 1) * pageSize, safePage * pageSize) : data;

  const goToPage = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);

  return { page: safePage, totalPages, pagedData, goToPage } as const;
}

interface TableBodyProps<T> {
  pagedData: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (row: T) => string;
  isExpandable: boolean;
  expandedRowId?: string | null;
  onToggleExpand?: (rowId: string | null) => void;
  renderExpandedRow?: (row: T) => ReactNode;
}

function isFromInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, input, select, textarea") !== null;
}

function TableBodyInner<T>({
  pagedData,
  columns,
  getRowId,
  isExpandable,
  expandedRowId,
  onToggleExpand,
  renderExpandedRow,
}: TableBodyProps<T>) {
  return (
    <tbody>
      {pagedData.map((row, rowIndex) => {
        const rowId = getRowId?.(row) ?? String(rowIndex);
        const isExpanded = expandedRowId === rowId;
        const toggle = () => onToggleExpand?.(isExpanded ? null : rowId);
        return (
          <Fragment key={rowId}>
            <tr
              aria-expanded={isExpandable ? isExpanded : undefined}
              className={cn(
                "border-b border-border transition-colors",
                rowIndex % 2 === 0 ? "bg-bg-card" : "bg-bg-primary",
                "hover:bg-hover",
                isExpanded && "bg-accent-light",
              )}
              onClick={isExpandable ? (e) => (isFromInteractive(e.target) ? undefined : toggle()) : undefined}
              onKeyDown={
                isExpandable
                  ? (e) => {
                      if (isFromInteractive(e.target)) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle();
                      }
                    }
                  : undefined
              }
              role={isExpandable ? "button" : undefined}
              tabIndex={isExpandable ? 0 : undefined}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.id}
                  className={cn(
                    "px-3 py-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.hiddenMd && "hidden md:table-cell",
                    isExpandable && "cursor-pointer",
                  )}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpandable && colIdx === 0 && (
                      <span className="shrink-0 text-text-secondary">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    )}
                    {col.cell(row)}
                  </div>
                </td>
              ))}
            </tr>
            {isExpanded && renderExpandedRow && (
              <tr className="border-b border-border bg-bg-secondary/50">
                <td colSpan={columns.length} className="p-0">
                  {renderExpandedRow(row)}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );
}

const TableBody = memo(TableBodyInner) as typeof TableBodyInner;

function DataTableInner<T>({
  data,
  columns,
  getRowId,
  pageSize = 10,
  expandedRowId,
  onToggleExpand,
  renderExpandedRow,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const effectivePageSize = isMobile ? Math.min(pageSize, 15) : pageSize;
  const { t } = useTranslation();

  const isExpandable = !!(renderExpandedRow && onToggleExpand);
  const hasHeaders = columns.some((col) => col.header !== undefined);

  const dedupedData = useMemo(() => {
    if (!getRowId) return data;
    const seen = new Set<string>();
    return data.filter((record) => {
      const key = getRowId(record);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data, getRowId]);

  const { page, totalPages, pagedData, goToPage } = useTablePagination(dedupedData, effectivePageSize);

  return (
    <div className="flex flex-col gap-2">
      {dedupedData.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-secondary">{t("noResults")}</div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-x-auto min-w-0">
            <table className="w-full text-sm table-auto">
              {hasHeaders && (
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className={cn(
                          "px-3 py-2 text-xs font-semibold text-text-secondary bg-bg-secondary",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.hiddenMd && "hidden md:table-cell",
                        )}
                        style={{ width: col.width }}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <TableBody
                pagedData={pagedData}
                columns={columns}
                getRowId={getRowId}
                isExpandable={isExpandable}
                expandedRowId={expandedRowId}
                onToggleExpand={onToggleExpand}
                renderExpandedRow={renderExpandedRow}
              />
            </table>
          </div>
          {dedupedData.length > effectivePageSize && (
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} className="pt-1 self-center" />
          )}
        </>
      )}
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;

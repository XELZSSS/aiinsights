import { memo, Fragment, useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useIsMobile, usePagination } from "@/app/hooks";
import { cn } from "@/shared/utils";
import { Pagination } from "@/app/components/ui";

export interface DataTableColumn<T> {
  id: string;
  header?: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  hiddenMd?: boolean;
  mobilePrimary?: boolean;
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
                "border-b border-border last:border-b-0 transition-colors",
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
                    "px-3 py-3.5 sm:py-3",
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
              <tr className="border-b border-border last:border-b-0 bg-bg-secondary/50">
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

function MobileTableBodyInner<T>({
  pagedData,
  columns,
  getRowId,
  isExpandable,
  expandedRowId,
  onToggleExpand,
  renderExpandedRow,
}: TableBodyProps<T>) {
  return (
    <div className="flex flex-col gap-2.5">
      {pagedData.map((row, rowIndex) => {
        const rowId = getRowId?.(row) ?? String(rowIndex);
        const isExpanded = expandedRowId === rowId;
        const toggle = () => onToggleExpand?.(isExpanded ? null : rowId);
        const visibleCols = columns.filter((col) => !col.hiddenMd);
        const primaryCol = visibleCols[0];
        const restCols = visibleCols.slice(1);
        const mainStatCol = restCols.find((col) => col.mobilePrimary) ?? restCols[0];
        const secondaryCols = restCols.filter((col) => col !== mainStatCol);
        return (
          <Fragment key={rowId}>
            <div
              aria-expanded={isExpandable ? isExpanded : undefined}
              role={isExpandable ? "button" : undefined}
              tabIndex={isExpandable ? 0 : undefined}
              className={cn(
                "rounded-lg border border-border bg-bg-card p-3.5 transition-colors",
                isExpandable && "cursor-pointer",
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
            >
              <div className="flex items-start gap-2 min-w-0">
                {isExpandable && (
                  <span className="shrink-0 text-text-secondary mt-0.5">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
                <div className="min-w-0 flex-1">{primaryCol?.cell(row)}</div>
                {mainStatCol && (
                  <div className="shrink-0 text-right min-w-0 max-w-[45%]">
                    {mainStatCol.header && (
                      <span className="text-[11px] sm:text-xs text-text-secondary mr-1 truncate">
                        {mainStatCol.header}
                      </span>
                    )}
                    <span className="text-sm font-semibold">{mainStatCol.cell(row)}</span>
                  </div>
                )}
              </div>
              {secondaryCols.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
                  {secondaryCols.map((col) => (
                    <div
                      key={col.id}
                      className={cn("flex items-baseline gap-1 min-w-0", col.align === "right" && "ml-auto")}
                    >
                      {col.header && (
                        <span className="text-[11px] sm:text-xs text-text-secondary shrink-0">{col.header}</span>
                      )}
                      <span className="text-xs sm:text-sm min-w-0">{col.cell(row)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isExpanded && renderExpandedRow && (
              <div className="rounded-lg border border-border bg-bg-secondary/50 overflow-hidden">
                {renderExpandedRow(row)}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const MobileTableBody = memo(MobileTableBodyInner) as typeof MobileTableBodyInner;

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

  const { page, totalPages, pagedData, goToPage } = usePagination(dedupedData, effectivePageSize);

  return (
    <div className="flex flex-col gap-2">
      {dedupedData.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-secondary">{t("noResults")}</div>
      ) : isMobile ? (
        <>
          <MobileTableBody
            pagedData={pagedData}
            columns={columns}
            getRowId={getRowId}
            isExpandable={isExpandable}
            expandedRowId={expandedRowId}
            onToggleExpand={onToggleExpand}
            renderExpandedRow={renderExpandedRow}
          />
          {dedupedData.length > effectivePageSize && (
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} className="pt-1 self-center" />
          )}
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-x-auto min-w-0">
            <table className="w-full text-sm table-auto">
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

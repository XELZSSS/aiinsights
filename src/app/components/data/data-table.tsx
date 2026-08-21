import { Fragment, memo, useMemo, type ReactNode } from "react";
import { useTranslation } from "@/app/i18n";
import { useDevice } from "@/app/device";
import { usePagination } from "@/app/hooks";
import { cn } from "@/shared/utils";
import { Pagination } from "@/app/components/ui";
import type { DataTableColumn } from "./types";
import { expandableRowProps, Chevron } from "./expandable-row";
import { MobileTableBody } from "./mobile-card-list";

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

function cellClasses<T>(col: DataTableColumn<T>, isExpandable: boolean): string {
  return cn("px-3 py-3 sm:py-2.5", col.hiddenMd && "hidden md:table-cell", isExpandable && "cursor-pointer");
}

function cellInnerClasses<T>(col: DataTableColumn<T>): string {
  return cn("flex items-center gap-2 min-w-0", col.align === "right" && "justify-end");
}

function TableHeader<T>({ columns, isExpandable }: { columns: DataTableColumn<T>[]; isExpandable: boolean }) {
  return (
    <thead>
      <tr className="border-b border-border bg-bg-secondary/60">
        {columns.map((col, colIdx) => (
          <th
            key={col.id}
            scope="col"
            className={cn(cellClasses(col, false), "font-semibold text-text-secondary whitespace-nowrap")}
            style={{ width: col.width }}
          >
            <div className={cellInnerClasses(col)}>
              {isExpandable && colIdx === 0 && <span className="w-3.5 shrink-0" aria-hidden="true" />}
              {col.header}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
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
              {...expandableRowProps(isExpandable, isExpanded, toggle)}
              className={cn(
                "border-b border-border last:border-b-0 transition-colors",
                rowIndex % 2 === 0 ? "bg-bg-card" : "bg-bg-primary",
                "hover:bg-hover",
                isExpandable && "active:bg-selected",
                isExpanded && "bg-accent-light",
              )}
            >
              {columns.map((col, colIdx) => (
                <td key={col.id} className={cellClasses(col, isExpandable)} style={{ width: col.width }}>
                  <div className={cellInnerClasses(col)}>
                    {isExpandable && colIdx === 0 && <Chevron isExpanded={isExpanded} size={14} />}
                    {col.cell(row)}
                  </div>
                </td>
              ))}
            </tr>
            {isExpanded && renderExpandedRow && (
              <tr className="border-b border-border last:border-b-0 bg-bg-secondary/50">
                <td colSpan={columns.length} className="p-0">
                  <div className="animate-fade-in">{renderExpandedRow(row)}</div>
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
  const { isMobile } = useDevice();
  // Cap page size on mobile so long lists don't force excessive scrolling.
  const effectivePageSize = isMobile ? Math.min(pageSize, 15) : pageSize;
  const { t } = useTranslation();

  const isExpandable = !!(renderExpandedRow && onToggleExpand);

  // Deduplicate by getRowId so the same model isn't listed twice (e.g. across ranking sources).
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
              <TableHeader columns={columns} isExpandable={isExpandable} />
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

/**
 * Paginated data table with optional expandable rows; renders a native table on desktop
 * and a stacked card list on mobile, with a mobile-optimised column layout.
 */
export const DataTable = memo(DataTableInner) as typeof DataTableInner;

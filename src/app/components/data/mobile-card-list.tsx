import { Fragment, memo, type ReactNode } from "react";
import { cn } from "@/shared/utils";
import type { DataTableColumn } from "./types";
import { expandableRowProps, Chevron } from "./expandable-row";

interface MobileCardBodyProps<T> {
  pagedData: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (row: T) => string;
  isExpandable: boolean;
  expandedRowId?: string | null;
  onToggleExpand?: (rowId: string | null) => void;
  renderExpandedRow?: (row: T) => ReactNode;
}

interface MobileColumnLayout<T> {
  primaryCol: DataTableColumn<T>;
  mainStatCol?: DataTableColumn<T>;
  secondaryCols: DataTableColumn<T>[];
}

// On mobile the table becomes a list: the first visible column is the row title, the first
// stat column is emphasized, and the remaining columns are condensed into small pairs.
function resolveMobileColumns<T>(columns: DataTableColumn<T>[]): MobileColumnLayout<T> {
  const visibleCols = columns.filter((col) => !col.hiddenMd);
  const primaryCol = visibleCols[0]!;
  const restCols = visibleCols.slice(1);
  const mainStatCol = restCols.find((col) => col.mobilePrimary) ?? restCols[0];
  const secondaryCols = restCols.filter((col) => col !== mainStatCol);
  return { primaryCol, mainStatCol, secondaryCols };
}

function MobileTableBodyInner<T>({
  pagedData,
  columns,
  getRowId,
  isExpandable,
  expandedRowId,
  onToggleExpand,
  renderExpandedRow,
}: MobileCardBodyProps<T>) {
  const { primaryCol, mainStatCol, secondaryCols } = resolveMobileColumns(columns);
  return (
    <div className="flex flex-col gap-2.5">
      {pagedData.map((row, rowIndex) => {
        const rowId = getRowId?.(row) ?? String(rowIndex);
        const isExpanded = expandedRowId === rowId;
        const toggle = () => onToggleExpand?.(isExpanded ? null : rowId);
        return (
          <Fragment key={rowId}>
            <div
              {...expandableRowProps(isExpandable, isExpanded, toggle)}
              className={cn(
                "rounded-lg border border-border bg-bg-card p-3.5 transition-colors",
                isExpandable && "cursor-pointer active:bg-selected",
                "hover:bg-hover",
                isExpanded && "bg-accent-light",
              )}
            >
              <div className="flex items-start gap-2 min-w-0">
                {isExpandable && <Chevron isExpanded={isExpanded} size={16} className="mt-0.5" />}
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
              <div className="rounded-lg border border-border bg-bg-secondary/50 overflow-hidden animate-slide-up">
                {renderExpandedRow(row)}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export const MobileTableBody = memo(MobileTableBodyInner) as typeof MobileTableBodyInner;

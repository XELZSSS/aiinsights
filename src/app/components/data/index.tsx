import { memo, Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Clock, Building2, ExternalLink } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useIsMobile } from "@/app/hooks";
import { cn, getModelColor, approxEq, formatCompactDollar, safeHref } from "@/shared/utils";
import { Card, CardContent, Pagination } from "@/app/components/ui";
import { TabContainer, CardGrid, type TabItem } from "@/app/components/composite";
import type { ModelPrediction, ReleasePrediction, ProviderPrediction, PredictionsPayload } from "@/shared/types";

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
        return (
          <TableRow
            key={rowId}
            row={row}
            columns={columns}
            rowIndex={rowIndex}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            rowId={rowId}
            onToggleExpand={onToggleExpand}
            renderExpandedRow={renderExpandedRow}
          />
        );
      })}
    </tbody>
  );
}

interface TableRowProps<T> {
  row: T;
  columns: DataTableColumn<T>[];
  rowIndex: number;
  isExpandable: boolean;
  isExpanded: boolean;
  rowId: string;
  onToggleExpand?: (rowId: string | null) => void;
  renderExpandedRow?: (row: T) => ReactNode;
}

function TableRow<T>({
  row,
  columns,
  rowIndex,
  isExpandable,
  isExpanded,
  rowId,
  onToggleExpand,
  renderExpandedRow,
}: TableRowProps<T>) {
  const toggle = () => onToggleExpand?.(isExpanded ? null : rowId);
  return (
    <Fragment>
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
}

const TableBody = memo(TableBodyInner) as typeof TableBodyInner;

function DataTableInner<T>({
  data,
  columns,
  getRowId,
  pageSize = 30,
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

const LINE_CLAMP = "line-clamp-1 sm:line-clamp-2";

function isTopProbability(prob: number, topProb: number): boolean {
  return prob === topProb || (topProb > 0 && approxEq(prob, topProb));
}

const ExternalLinkButton = memo(function ExternalLinkButton({
  href,
  children,
  showIcon = true,
  className,
  iconSize = 14,
}: {
  href: string | null | undefined;
  children?: ReactNode;
  showIcon?: boolean;
  className?: string;
  iconSize?: number;
}) {
  const safeUrl = safeHref(href);
  if (!safeUrl) return null;
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-text-tertiary hover:text-text-primary transition-colors", className)}
    >
      {children || (showIcon && <ExternalLink size={iconSize} />)}
    </a>
  );
});

const EmptyPredictions = memo(function EmptyPredictions() {
  const { t } = useTranslation();
  return <p className="text-xs text-text-secondary py-4 text-center">{t("noPredictions")}</p>;
});

const ModelRankingTab = memo(function ModelRankingTab({ items }: { items: ModelPrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  const sorted = [...items].sort((a, b) => b.probability - a.probability);

  return (
    <CardGrid>
      {sorted.map((item, i) => (
        <Card key={item.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-extrabold w-5 text-center shrink-0" style={{ color: getModelColor(i) }}>
                  #{i + 1}
                </span>
                <span className="text-sm font-semibold truncate">{item.company}</span>
              </div>
              <ExternalLinkButton href={item.url} iconSize={12} />
            </div>
            <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold tabular-nums font-mono" style={{ color: getModelColor(i) }}>
                {(item.probability * 100).toFixed(1)}%
              </span>
              <div className="text-right text-xs text-text-tertiary">
                <div>{formatCompactDollar(item.volume)}</div>
                {item.deadline && <div>{item.deadline}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </CardGrid>
  );
});

const ReleasesTab = memo(function ReleasesTab({ items }: { items: ReleasePrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  return (
    <CardGrid cols={2}>
      {items.map((item, i) => {
        const topProb = item.predictions.reduce((max, p) => Math.max(max, p.probability), 0);
        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock size={14} className="shrink-0" style={{ color: getModelColor(i + 3) }} />
                  <span className="text-sm font-semibold truncate">{item.model}</span>
                </div>
                <ExternalLinkButton href={item.url} iconSize={12} />
              </div>
              <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
              <div className="flex flex-col gap-1">
                {item.predictions.map((p, j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary truncate">{p.window}</span>
                    <span
                      className="text-sm font-semibold shrink-0 tabular-nums font-mono"
                      style={{
                        color: isTopProbability(p.probability, topProb) ? getModelColor(i + 3) : "var(--text-tertiary)",
                      }}
                    >
                      {(p.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-text-tertiary">{formatCompactDollar(item.volume)}</div>
            </CardContent>
          </Card>
        );
      })}
    </CardGrid>
  );
});

const ProvidersTab = memo(function ProvidersTab({ items }: { items: ProviderPrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  return (
    <CardGrid>
      {items.map((item, i) => {
        const topProb = item.options.reduce((max, o) => Math.max(max, o.probability), 0);
        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 size={14} className="shrink-0" style={{ color: getModelColor(i + 6) }} />
                  <span className="text-sm font-semibold truncate">{item.provider}</span>
                </div>
                <ExternalLinkButton href={item.url} iconSize={12} />
              </div>
              <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
              <div className="flex flex-col gap-1">
                {item.options.slice(0, 3).map((opt, j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary truncate">{opt.label}</span>
                    <span
                      className="text-sm font-semibold shrink-0 tabular-nums font-mono"
                      style={{
                        color: isTopProbability(opt.probability, topProb)
                          ? getModelColor(i + 6)
                          : "var(--text-tertiary)",
                      }}
                    >
                      {(opt.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
                <span>{formatCompactDollar(item.volume)}</span>
                {item.deadline && <span>{item.deadline}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </CardGrid>
  );
});

export const PredictionsSection = memo(function PredictionsSection({ data }: { data: PredictionsPayload }) {
  const { t } = useTranslation();

  const [activePredictionTab, setActivePredictionTab] = useState("rankings");

  const hasData = data.modelRankings.length > 0 || data.releases.length > 0 || data.providers.length > 0;
  if (!hasData) return null;

  const tabs: TabItem[] = [
    { id: "rankings", label: t("modelRankingPredictions") },
    { id: "releases", label: t("releasePredictions") },
    { id: "providers", label: t("providerPredictions") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <TabContainer tabs={tabs} activeTab={activePredictionTab} tabSize="sm" onTabChange={setActivePredictionTab}>
        {(activeTab) => (
          <>
            {activeTab === "rankings" && <ModelRankingTab items={data.modelRankings} />}
            {activeTab === "releases" && <ReleasesTab items={data.releases} />}
            {activeTab === "providers" && <ProvidersTab items={data.providers} />}
          </>
        )}
      </TabContainer>
    </div>
  );
});
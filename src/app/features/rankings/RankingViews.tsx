import { useMemo } from "react";
import { useTranslation } from "@/app/i18n";
import { useFilteredData } from "@/app/hooks";
import { DataTable, type DataTableColumn } from "@/app/components/data";
import { formatShortNumber } from "@/shared/utils";
import type { OpenSourceModelEntry, HallucinationRankingEntry } from "@/shared/types";

export const RANKING_TABS = [
  "modelRankings",
  "openRouterRankings",
  "openSourceRankings",
  "hallucinationRankings",
  "providerCompare",
] as const;

export type RankingTabId = (typeof RANKING_TABS)[number];

interface RankingTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  getSearchFields: (row: T) => string[];
}

function RankingTable<T>({ data, columns, getRowId, getSearchFields }: RankingTableProps<T>) {
  const { t } = useTranslation();
  const filtered = useFilteredData(data, getSearchFields);

  return (
    <div className="flex flex-col gap-4">
      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary py-8 text-center">{t("noResults")}</p>
      ) : (
        <DataTable data={filtered} columns={columns} getRowId={getRowId} pageSize={8} />
      )}
    </div>
  );
}

const getOpenSourceRowId = (model: OpenSourceModelEntry) => model.id;
const getOpenSourceSearchFields = (model: OpenSourceModelEntry) => [model.id];

export function OpenSourceRankingsView({ rankings }: { rankings: OpenSourceModelEntry[] }) {
  const { t } = useTranslation();

  const columns = useMemo<Parameters<typeof RankingTable<OpenSourceModelEntry>>[0]["columns"]>(
    () => [
      {
        id: "model",
        header: t("model"),
        cell: (item) => <p className="text-sm font-medium truncate">{item.id.split("/").pop() || item.id}</p>,
      },
      {
        id: "downloads",
        header: t("downloads"),
        align: "right",
        cell: (item) => <span className="text-sm font-semibold">{formatShortNumber(item.downloads)}</span>,
      },
      {
        id: "likes",
        header: t("likes"),
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{formatShortNumber(item.likes)}</span>,
      },
      {
        id: "license",
        header: t("license"),
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{item.license || t("notAvailable")}</span>,
      },
    ],
    [t],
  );

  return (
    <RankingTable
      data={rankings}
      columns={columns}
      getRowId={getOpenSourceRowId}
      getSearchFields={getOpenSourceSearchFields}
    />
  );
}

function fmtRate(v: number | null) {
  return v == null ? "n/a" : `${v.toFixed(1)}%`;
}

function fmtScore(v: number) {
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const getHallRowId = (entry: HallucinationRankingEntry) => entry.id || entry.slug || entry.model;
const getHallSearchFields = (entry: HallucinationRankingEntry) => [entry.model];

export function HallucinationRankingsView({ rankings }: { rankings: HallucinationRankingEntry[] }) {
  const { t } = useTranslation();

  const columns = useMemo<Parameters<typeof RankingTable<HallucinationRankingEntry>>[0]["columns"]>(
    () => [
      {
        id: "model",
        header: t("model"),
        cell: (item) => <p className="text-sm font-medium truncate">{item.model}</p>,
      },
      {
        id: "hallucinationRate",
        header: t("hallucinationRate"),
        align: "right",
        cell: (item) => <span className="text-sm font-semibold">{fmtRate(item.hallucinationRate)}</span>,
      },
      {
        id: "accuracy",
        header: t("accuracy"),
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtRate(item.accuracy)}</span>,
      },
      {
        id: "attemptRate",
        header: t("attemptRate"),
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtRate(item.attemptRate)}</span>,
      },
      {
        id: "omniscienceIndex",
        header: t("omniscienceIndex"),
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtScore(item.omniscienceIndex)}</span>,
      },
    ],
    [t],
  );

  return (
    <RankingTable data={rankings} columns={columns} getRowId={getHallRowId} getSearchFields={getHallSearchFields} />
  );
}

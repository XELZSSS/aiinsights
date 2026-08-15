import { useMemo } from "react";
import { useTranslation } from "@/app/i18n";
import { useFilteredData } from "@/app/hooks";
import { DataTable, type DataTableColumn } from "@/app/components/data";
import { TagBadge } from "@/app/components/ui";
import { RankingNameCell, RightAlignedText } from "@/app/components/composite";
import { formatDollar, formatShortNumber } from "@/shared/utils";
import type { TranslationKey } from "@/shared/i18n";
import type { TtsModel, OpenSourceModelEntry, HallucinationRankingEntry } from "@/shared/types";
import { useTtsLeaderboard } from "@/app/api/queries";

export const RANKING_TABS = [
  "modelRankings",
  "openRouterRankings",
  "openSourceRankings",
  "hallucinationRankings",
  "tts",
  "providerCompare",
] as const;

export type RankingTabId = (typeof RANKING_TABS)[number];

export const RANKING_TAB_INDEX: Record<RankingTabId, number> = {
  modelRankings: 0,
  openRouterRankings: 1,
  openSourceRankings: 2,
  hallucinationRankings: 3,
  tts: 4,
  providerCompare: 5,
};

interface RankingTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  getSearchFields: (row: T) => string[];
  noteKey: TranslationKey;
}

export function RankingTable<T>({ data, columns, getRowId, getSearchFields, noteKey }: RankingTableProps<T>) {
  const { t } = useTranslation();
  const filtered = useFilteredData(data, getSearchFields);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">{t(noteKey)}</p>
      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary py-8 text-center">{t("noResults")}</p>
      ) : (
        <DataTable data={filtered} columns={columns} getRowId={getRowId} />
      )}
    </div>
  );
}

const getTtsRowId = (model: TtsModel) => model.id;
const getTtsSearchFields = (m: TtsModel) => [m.name, m.provider || ""];

export function TtsView() {
  const { t } = useTranslation();
  const { data } = useTtsLeaderboard();

  const columns = useMemo<Parameters<typeof RankingTable<TtsModel>>[0]["columns"]>(
    () => [
      {
        id: "model",
        header: "",
        cell: (model) => (
          <>
            <RankingNameCell name={model.name} />
            <div className="flex flex-wrap gap-1 mt-1 md:hidden">
              {model.provider && <TagBadge>{model.provider}</TagBadge>}
              {model.speed_chars_per_sec != null && (
                <TagBadge>
                  {t("ttsSpeed")}: {model.speed_chars_per_sec.toFixed(1)}
                </TagBadge>
              )}
              {model.price_per_1m_chars != null && <TagBadge>{formatDollar(model.price_per_1m_chars, t)}</TagBadge>}
            </div>
          </>
        ),
      },
      {
        id: "provider",
        hiddenMd: true,
        align: "right",
        cell: (model) => <RightAlignedText>{model.provider || t("notAvailable")}</RightAlignedText>,
      },
      {
        id: "quality",
        align: "right",
        cell: (model) => (
          <span className="text-sm font-semibold">
            {model.quality_elo != null ? model.quality_elo.toFixed(0) : t("notAvailable")}
          </span>
        ),
      },
      {
        id: "speed",
        align: "right",
        hiddenMd: true,
        cell: (model) => (
          <span className="text-sm">
            {model.speed_chars_per_sec != null ? model.speed_chars_per_sec.toFixed(1) : t("notAvailable")}
          </span>
        ),
      },
      {
        id: "price",
        align: "right",
        hiddenMd: true,
        cell: (model) => <span className="text-sm">{formatDollar(model.price_per_1m_chars, t)}</span>,
      },
    ],
    [t],
  );

  return (
    <RankingTable
      data={data ?? []}
      columns={columns}
      getRowId={getTtsRowId}
      getSearchFields={getTtsSearchFields}
      noteKey="ttsSource"
    />
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
        header: "",
        cell: (item) => (
          <>
            <RankingNameCell name={item.id.split("/").pop() || item.id} />
            <div className="flex flex-wrap gap-1 mt-1 md:hidden">
              <TagBadge>
                {t("likes")}: {formatShortNumber(item.likes)}
              </TagBadge>
              {item.license && <TagBadge>{item.license}</TagBadge>}
            </div>
          </>
        ),
      },
      {
        id: "downloads",
        align: "right",
        cell: (item) => <span className="text-sm font-semibold">{formatShortNumber(item.downloads)}</span>,
      },
      {
        id: "likes",
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{formatShortNumber(item.likes)}</span>,
      },
      {
        id: "license",
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
      noteKey="openSourceDataSource"
    />
  );
}

function fmtRate(v: number) {
  return `${v.toFixed(1)}%`;
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
        header: "",
        cell: (item) => (
          <>
            <RankingNameCell name={item.model} />
            <div className="flex flex-wrap gap-1 mt-1 md:hidden">
              <TagBadge>
                {t("accuracy")}: {fmtRate(item.accuracy)}
              </TagBadge>
              <TagBadge>
                {t("attemptRate")}: {fmtRate(item.attemptRate)}
              </TagBadge>
              <TagBadge>
                {t("omniscienceIndex")}: {fmtScore(item.omniscienceIndex)}
              </TagBadge>
            </div>
          </>
        ),
      },
      {
        id: "hallucinationRate",
        align: "right",
        cell: (item) => <span className="text-sm font-semibold">{fmtRate(item.hallucinationRate)}</span>,
      },
      {
        id: "accuracy",
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtRate(item.accuracy)}</span>,
      },
      {
        id: "attemptRate",
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtRate(item.attemptRate)}</span>,
      },
      {
        id: "omniscienceIndex",
        align: "right",
        hiddenMd: true,
        cell: (item) => <span className="text-sm">{fmtScore(item.omniscienceIndex)}</span>,
      },
    ],
    [t],
  );

  return (
    <RankingTable
      data={rankings}
      columns={columns}
      getRowId={getHallRowId}
      getSearchFields={getHallSearchFields}
      noteKey="hallucinationSource"
    />
  );
}
import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { useFilteredData } from "../../hooks";
import { DataTable, type DataTableColumn } from "../../components/data/DataTable";
import { RankingNameCell } from "../../components/composite";
import { TagBadge } from "../../components/ui";
import type { HallucinationRankingEntry } from "../../../shared/types";

function fmtRate(v: number) {
  return `${v.toFixed(1)}%`;
}

function fmtScore(v: number) {
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const getRowId = (entry: HallucinationRankingEntry) => entry.id || entry.slug || entry.model;
const getSearchFields = (entry: HallucinationRankingEntry) => [entry.model];

export function HallucinationRankingsView({ rankings }: { rankings: HallucinationRankingEntry[] }) {
  const { t } = useTranslation();
  const filtered = useFilteredData(rankings, getSearchFields);

  const columns = useMemo<DataTableColumn<HallucinationRankingEntry>[]>(
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
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">{t("hallucinationSource")}</p>
      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary py-8 text-center">{t("noResults")}</p>
      ) : (
        <DataTable data={filtered} columns={columns} getRowId={getRowId} />
      )}
    </div>
  );
}

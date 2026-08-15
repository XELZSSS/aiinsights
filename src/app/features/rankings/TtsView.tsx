import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { useTts } from "../../api/queries";
import { useFilteredData } from "../../hooks";
import { TagBadge } from "../../components/ui";
import { DataTable, type DataTableColumn } from "../../components/data/DataTable";
import { RankingNameCell } from "../../components/composite";
import { RightAlignedText } from "../../components/composite";

import { formatDollar } from "../../../shared/utils/format";
import type { TtsModel } from "../../../shared/types";

const getRowId = (model: TtsModel) => model.id;
const getSearchFields = (m: TtsModel) => [m.name, m.provider || ""];

export function TtsView() {
  const { t } = useTranslation();
  const { data } = useTts();
  const filtered = useFilteredData(data ?? [], getSearchFields);

  const columns = useMemo<DataTableColumn<TtsModel>[]>(
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
        cell: (model) => <span className="text-sm font-semibold">{model.quality_elo != null ? model.quality_elo.toFixed(0) : t("notAvailable")}</span>,
      },
      {
        id: "speed",
        align: "right",
        hiddenMd: true,
        cell: (model) => <span className="text-sm">{model.speed_chars_per_sec != null ? model.speed_chars_per_sec.toFixed(1) : t("notAvailable")}</span>,
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
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">{t("ttsSource")}</p>
      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary py-8 text-center">{t("noResults")}</p>
      ) : (
        <DataTable data={filtered} columns={columns} getRowId={getRowId} />
      )}
    </div>
  );
}

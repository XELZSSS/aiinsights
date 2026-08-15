import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import { DataTable, type DataTableColumn } from "../../components/data/DataTable";
import { formatScore, formatPricePerMillion } from "../../../shared/utils/format";

import { computeProviderStats, type ProviderStats } from "../../../shared/utils";
import type { ArtificialAnalysisModel } from "../../../shared/types";

const getRowId = (p: ProviderStats) => p.name;

export function ProviderCompareView({ data }: { data: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();

  const providerStats = useMemo(() => computeProviderStats(data), [data]);

  const columns = useMemo<DataTableColumn<ProviderStats>[]>(
    () => [
      {
        id: "name",
        cell: (p) => (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="font-medium text-sm">{p.name}</span>
          </div>
        ),
      },
      { id: "count", align: "right", cell: (p) => <span className="font-medium">{p.count}</span> },
      {
        id: "avgIntelligence",
        align: "right",
        cell: (p) => formatScore(t, p.avgIntelligence),
      },
      {
        id: "avgPrice",
        align: "right",
        hiddenMd: true,
        cell: (p) => formatPricePerMillion(p.avgPrice, t),
      },
      {
        id: "avgSpeed",
        align: "right",
        hiddenMd: true,
        cell: (p) => (p.avgSpeed != null ? `${p.avgSpeed.toFixed(1)} tok/s` : t("notAvailable")),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">{t("artificialSource")}</p>
      <DataTable columns={columns} data={providerStats} getRowId={getRowId} />
    </div>
  );
}

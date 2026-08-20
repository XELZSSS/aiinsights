import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/app/components/data";

import { Card } from "@/app/components/ui";
import { OpenRouterModelDetail } from "@/app/components/composite";
import type { OpenRouterRankingsPayload, OpenRouterRankEntry } from "@/shared/types";
import { useTranslation } from "@/app/i18n";
import { buildOpenRouterColumns } from "@/app/features/rankings/columns";

const getModelRowId = (r: OpenRouterRankEntry) => r.id;

/** Token-usage rankings table from OpenRouter, with expandable per-model details. */
export function OpenRouterRankingsView({ data }: { data?: OpenRouterRankingsPayload }) {
  const { t } = useTranslation();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const modelColumns = useMemo(() => buildOpenRouterColumns(t), [t]);

  if (!data) {
    return (
      <Card className="text-center border-dashed p-6">
        <ShieldAlert className="size-8 mx-auto text-text-secondary mb-2" />
        <p className="text-sm text-text-secondary">{t("noRankingsData")}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <DataTable
          data={data.tokenUsageRankings ?? []}
          columns={modelColumns}
          getRowId={getModelRowId}
          pageSize={8}
          expandedRowId={expandedRowId}
          onToggleExpand={setExpandedRowId}
          renderExpandedRow={(item) => (
            <div className="p-4 sm:p-5">
              <OpenRouterModelDetail model={item} />
            </div>
          )}
        />
      </div>
    </div>
  );
}

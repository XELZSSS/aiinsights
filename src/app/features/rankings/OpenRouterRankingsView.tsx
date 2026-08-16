import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/app/components/data";

import { StatCard } from "@/app/components/composite";
import { Card } from "@/app/components/ui";
import type { OpenRouterRankingsPayload, OpenRouterRankEntry } from "@/shared/types";
import { useTranslation } from "@/app/i18n";
import { formatShortNumber, categoryLabel } from "@/shared/utils";
import { getModelRecommendation } from "@/shared/utils";
import { buildOpenRouterColumns } from "@/app/features/rankings/columns";

const getModelRowId = (r: OpenRouterRankEntry) => r.id;

function ModelExpandedDetail({ item }: { item: OpenRouterRankEntry }) {
  const { t } = useTranslation();
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label={t("creatorOrVendor")} value={item.creator} />
        <StatCard label={t("inputTokens")} value={formatShortNumber(item.promptTokens || 0)} />
        <StatCard label={t("outputTokens")} value={formatShortNumber(item.completionTokens || 0)} />
        {item.reasoningTokens ? (
          <StatCard label={t("reasoningTokens")} value={formatShortNumber(item.reasoningTokens)} />
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-bg-secondary">
        <p className="text-xs font-semibold text-text-primary">{t("techSelectionAdvice")}</p>
        <p className="text-xs text-text-secondary leading-relaxed">{getModelRecommendation(item.id, t)}</p>
      </div>
      <div className="flex flex-row justify-between items-center text-xs text-text-secondary gap-x-3 gap-y-1 flex-wrap">
        <span>
          {t("apiModelId")}: <code className="font-mono bg-bg-tertiary px-1.5 py-0.5 rounded">{item.id}</code>
        </span>
        <span>
          {t("todayCategory")}: <span className="font-semibold uppercase">{categoryLabel(item.category, t)}</span>
        </span>
      </div>
    </div>
  );
}

export function OpenRouterRankingsView({ data }: { data?: OpenRouterRankingsPayload }) {
  const { t } = useTranslation();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { modelColumns } = useMemo(() => buildOpenRouterColumns(t), [t]);

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
          expandedRowId={expandedRowId}
          onToggleExpand={setExpandedRowId}
          renderExpandedRow={(item) => <ModelExpandedDetail item={item} />}
        />
      </div>
    </div>
  );
}
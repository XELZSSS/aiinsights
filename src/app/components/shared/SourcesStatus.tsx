import { memo } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useSourcesStatus } from "@/app/api/queries";
import { Button, Dot } from "@/app/components/ui";
import { cn, formatRelativeTime, formatUptime } from "@/shared/utils";
import type { SourceStatus } from "@/shared/types";
import type { TranslationKey } from "@/shared/i18n";

const SOURCE_LABEL_KEYS: Record<SourceStatus["id"], TranslationKey> = {
  arena: "sourceNameArena",
  artificialAnalysis: "sourceNameArtificial",
  huggingface: "sourceNameHuggingFace",
  openrouter: "sourceNameOpenRouter",
  news: "sourceNameNews",
};

const dotColors = {
  ok: "var(--success)",
  fail: "var(--destructive)",
  pending: "var(--text-tertiary)",
} as const;

const SourceRow = memo(function SourceRow({ source }: { source: SourceStatus }) {
  const { t } = useTranslation();
  const label = t(SOURCE_LABEL_KEYS[source.id]);
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Dot size="sm" color={source.ok ? dotColors.ok : dotColors.fail} />
        <span className="text-sm truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        {source.error ? (
          <span className="text-xs text-text-secondary truncate max-w-[9rem]" title={source.error}>
            {source.error}
          </span>
        ) : source.latencyMs != null ? (
          <span className="text-xs font-mono text-text-secondary">{(source.latencyMs / 1000).toFixed(2)}s</span>
        ) : null}
        <span className={cn("text-xs shrink-0", source.ok ? "text-success" : "text-destructive")}>
          {t(source.ok ? "statusOnline" : "statusOffline")}
        </span>
      </div>
    </div>
  );
});

export const SourcesStatusList = memo(function SourcesStatusList() {
  const { t } = useTranslation();
  const { data, isPending, isError, isRefreshing, refresh } = useSourcesStatus();

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">{t("statusLoadFailed")}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          {t("refresh")}
        </Button>
      </div>
    );
  }

  const sources = data?.sources ?? [];
  const online = sources.filter((s) => s.ok).length;
  const total = sources.length;

  return (
    <div className="flex flex-col gap-3">
      {data && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-secondary">{t("serviceUptime")}</span>
          <span className="text-sm font-semibold font-mono">{formatUptime(t, data.uptimeMs)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {isPending && total === 0 ? t("statusChecking") : t("statusSummary", { ok: online, total })}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {data?.checkedAt && (
            <span className="text-xs text-text-secondary hidden sm:inline">
              {t("lastUpdated")} {formatRelativeTime(data.checkedAt, t)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
            aria-label={t("refresh")}
          >
            <RefreshCw size={12} className={cn(isRefreshing && "animate-spin")} />
            <span className="ml-1">{t("refresh")}</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Dot size="sm" color={dotColors.pending} />
            {t("statusChecking")}
          </div>
        ) : (
          sources.map((source) => <SourceRow key={source.id} source={source} />)
        )}
      </div>
    </div>
  );
});

import { CheckCircle, XCircle, Clock, Zap, Server } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { Card, CardContent } from "@/app/components/ui";
import type { HealthEntry } from "@/shared/types";
import { useSuspenseHealthStatus, useSystemStats } from "@/app/api/queries";
import { SuspenseQuery } from "@/app/components/shared";
import { PageContainer, PageHeader, PageSection } from "@/app/components/layout";
import { CardGrid } from "@/app/components/composite";

function HealthStatusBadge({ status, label }: { status: HealthEntry["status"]; label?: string }) {
  const { t } = useTranslation();
  const text = label ?? (status === "ok" ? t("statusOk") : t("statusError"));
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status === "ok" ? "text-success" : "text-destructive"}`}
    >
      {status === "ok" ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {text}
    </span>
  );
}

function DataSourceCard({ entry }: { entry: HealthEntry }) {
  const { t } = useTranslation();
  const ok = entry.status === "ok";

  return (
    <Card className={ok ? "" : "border-destructive/30"}>
      {!ok && <div className="h-1 bg-destructive shrink-0" />}
      <CardContent padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold truncate">{entry.name}</p>
          {ok ? (
            <CheckCircle size={14} className="shrink-0 text-success" />
          ) : (
            <XCircle size={14} className="shrink-0 text-destructive" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Zap size={12} className="shrink-0" />
            <span>{ok ? t("responseTimeMs", { value: entry.responseTime }) : t("notAvailable")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock size={12} className="shrink-0" />
            <span>{ok ? t("httpStatus", { value: String(entry.statusCode) }) : t("statusError")}</span>
          </div>
          {!ok && entry.detail && <p className="text-xs text-destructive mt-1 truncate">{entry.detail}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusContent() {
  const { t } = useTranslation();
  const { data } = useSuspenseHealthStatus();
  const { data: stats } = useSystemStats();

  const allOk = data.length > 0 && data.every((e) => e.status === "ok");
  const okCount = data.filter((e) => e.status === "ok").length;
  const errorCount = data.length - okCount;

  return (
    <PageContainer>
      <PageHeader title={t("systemStatus")} />
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-lg border border-border bg-bg-card">
        <p className="text-sm font-semibold">{t("overallStatus")}</p>
        <HealthStatusBadge status={allOk ? "ok" : "error"} label={allOk ? t("allHealthy") : t("hasIssues")} />
        <span className="text-xs text-text-secondary">
          ({okCount}/{data.length})
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-accent border border-accent/30 bg-accent-light">
          <Server size={12} />
          {stats?.runtime === "cloudflare" ? t("runtimeCloudflare") : t("runtimeLocal")}
        </span>
      </div>

      {errorCount > 0 && (
        <PageSection title={t("hasIssues")}>
          <CardGrid gap={4}>
            {data
              .filter((e) => e.status !== "ok")
              .map((entry) => (
                <DataSourceCard key={entry.name} entry={entry} />
              ))}
          </CardGrid>
        </PageSection>
      )}

      <PageSection title={t("healthySources")}>
        <CardGrid gap={4}>
          {data
            .filter((e) => e.status === "ok")
            .map((entry) => (
              <DataSourceCard key={entry.name} entry={entry} />
            ))}
        </CardGrid>
      </PageSection>
    </PageContainer>
  );
}

export function StatusView() {
  return (
    <SuspenseQuery>
      <StatusContent />
    </SuspenseQuery>
  );
}

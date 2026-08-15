import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Zap, ArrowLeft, Server } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useDocumentTitle } from "../../hooks";
import { Card, CardContent } from "../../components/ui";
import type { HealthEntry } from "../../../shared/types";
import { useSuspenseHealthStatus, useSystemStats } from "../../api/queries";
import { SuspenseQuery } from "../../components/feedback/SuspenseQuery";
import { PageContainer, PageHeader, PageSection } from "../../components/layout";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl font-bold text-accent/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-text-primary">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("notFound")}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent-light transition-colors"
        >
          <ArrowLeft size={14} />
          {t("backToHome")}
        </Link>
      </div>
    </PageContainer>
  );
}

function HealthStatusBadge({ status, label }: { status: HealthEntry["status"]; label?: string }) {
  const { t } = useTranslation();
  const text = label ?? (status === "ok" ? t("statusOk") : t("statusError"));
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status === "ok" ? "text-success" : "text-destructive"}`}>
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
          {ok ? <CheckCircle size={14} className="shrink-0 text-success" /> : <XCircle size={14} className="shrink-0 text-destructive" />}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data
              .filter((e) => e.status !== "ok")
              .map((entry) => (
                <DataSourceCard key={entry.name} entry={entry} />
              ))}
          </div>
        </PageSection>
      )}

      <PageSection title={t("healthySources")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data
            .filter((e) => e.status === "ok")
            .map((entry) => (
              <DataSourceCard key={entry.name} entry={entry} />
            ))}
        </div>
      </PageSection>
    </PageContainer>
  );
}

export function StatusView() {
  const { t } = useTranslation();
  useDocumentTitle(t("systemStatus"));
  return (
    <SuspenseQuery>
      <StatusContent />
    </SuspenseQuery>
  );
}
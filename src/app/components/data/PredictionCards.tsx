import { memo, useState, type ReactNode } from "react";
import { Clock, Building2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "../ui";
import { TabContainer, type TabItem } from "../composite";

import { getModelColor } from "../../../shared/utils";
import { approxEq } from "../../../shared/utils";
import { useTranslation } from "../../i18n";
import type { ModelPrediction, ReleasePrediction, ProviderPrediction, PredictionsPayload } from "../../../shared/types";
import { formatCompactDollar, safeHref } from "../../../shared/utils/format";
import { cn } from "../../../shared/utils";

const LINE_CLAMP = "line-clamp-1 sm:line-clamp-2";

function isTopProbability(prob: number, topProb: number): boolean {
  return prob === topProb || (topProb > 0 && approxEq(prob, topProb));
}

const ExternalLinkButton = memo(function ExternalLinkButton({
  href,
  children,
  showIcon = true,
  className,
  iconSize = 14,
}: {
  href: string | null | undefined;
  children?: ReactNode;
  showIcon?: boolean;
  className?: string;
  iconSize?: number;
}) {
  const safeUrl = safeHref(href);
  if (!safeUrl) return null;
  return (
    <a href={safeUrl} target="_blank" rel="noopener noreferrer" className={cn("text-text-tertiary hover:text-text-primary transition-colors", className)}>
      {children || (showIcon && <ExternalLink size={iconSize} />)}
    </a>
  );
});

const EmptyPredictions = memo(function EmptyPredictions() {
  const { t } = useTranslation();
  return <p className="text-xs text-text-secondary py-4 text-center">{t("noPredictions")}</p>;
});

const ModelRankingTab = memo(function ModelRankingTab({ items }: { items: ModelPrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  const sorted = [...items].sort((a, b) => b.probability - a.probability);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {sorted.map((item, i) => (
        <Card key={item.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-extrabold w-5 text-center shrink-0" style={{ color: getModelColor(i) }}>
                  #{i + 1}
                </span>
                <span className="text-sm font-semibold truncate">{item.company}</span>
              </div>
              <ExternalLinkButton href={item.url} iconSize={12} />
            </div>
            <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold tabular-nums font-mono" style={{ color: getModelColor(i) }}>
                {(item.probability * 100).toFixed(1)}%
              </span>
              <div className="text-right text-xs text-text-tertiary">
                <div>{formatCompactDollar(item.volume)}</div>
                {item.deadline && <div>{item.deadline}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

const ReleasesTab = memo(function ReleasesTab({ items }: { items: ReleasePrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, i) => {
        const topProb = item.predictions.reduce((max, p) => Math.max(max, p.probability), 0);
        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock size={14} className="shrink-0" style={{ color: getModelColor(i + 3) }} />
                  <span className="text-sm font-semibold truncate">{item.model}</span>
                </div>
                <ExternalLinkButton href={item.url} iconSize={12} />
              </div>
              <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
              <div className="flex flex-col gap-1">
                {item.predictions.map((p, j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary truncate">{p.window}</span>
                    <span
                      className="text-sm font-semibold shrink-0 tabular-nums font-mono"
                      style={{ color: isTopProbability(p.probability, topProb) ? getModelColor(i + 3) : "var(--text-tertiary)" }}
                    >
                      {(p.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-text-tertiary">{formatCompactDollar(item.volume)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

const ProvidersTab = memo(function ProvidersTab({ items }: { items: ProviderPrediction[] }) {
  if (items.length === 0) return <EmptyPredictions />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item, i) => {
        const topProb = item.options.reduce((max, o) => Math.max(max, o.probability), 0);
        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 size={14} className="shrink-0" style={{ color: getModelColor(i + 6) }} />
                  <span className="text-sm font-semibold truncate">{item.provider}</span>
                </div>
                <ExternalLinkButton href={item.url} iconSize={12} />
              </div>
              <p className={cn("text-xs text-text-secondary mb-2", LINE_CLAMP)}>{item.question}</p>
              <div className="flex flex-col gap-1">
                {item.options.slice(0, 3).map((opt, j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary truncate">{opt.label}</span>
                    <span
                      className="text-sm font-semibold shrink-0 tabular-nums font-mono"
                      style={{ color: isTopProbability(opt.probability, topProb) ? getModelColor(i + 6) : "var(--text-tertiary)" }}
                    >
                      {(opt.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
                <span>{formatCompactDollar(item.volume)}</span>
                {item.deadline && <span>{item.deadline}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

export const PredictionsSection = memo(function PredictionsSection({ data }: { data: PredictionsPayload }) {
  const { t } = useTranslation();

  const [activePredictionTab, setActivePredictionTab] = useState("rankings");

  const hasData = data.modelRankings.length > 0 || data.releases.length > 0 || data.providers.length > 0;
  if (!hasData) return null;

  const tabs: TabItem[] = [
    { id: "rankings", label: t("modelRankingPredictions") },
    { id: "releases", label: t("releasePredictions") },
    { id: "providers", label: t("providerPredictions") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <TabContainer tabs={tabs} activeTab={activePredictionTab} tabSize="sm" onTabChange={setActivePredictionTab}>
        {(activeTab) => (
          <>
            {activeTab === "rankings" && <ModelRankingTab items={data.modelRankings} />}
            {activeTab === "releases" && <ReleasesTab items={data.releases} />}
            {activeTab === "providers" && <ProvidersTab items={data.providers} />}
          </>
        )}
      </TabContainer>
    </div>
  );
});

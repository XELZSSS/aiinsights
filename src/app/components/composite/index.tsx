import { memo, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Trash2, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, Button } from "@/app/components/ui";
import { useTranslation } from "@/app/i18n";
import type { TranslationKey, TFunction } from "@/shared/i18n";
import type { ArtificialAnalysisModel } from "@/shared/types";
import {
  cn,
  modelId,
  formatBoolean,
  formatPricePerMillion,
  formatScore,
  formatTokens,
  benchmarkLabel,
  orNA,
  normalizePercent,
  getOutputSpeed,
} from "@/shared/utils";

export function BackButton({
  labelKey = "backToHome",
  to,
  state,
}: {
  labelKey?: TranslationKey;
  to: string;
  state?: unknown;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Button size="sm" variant="outline" onClick={() => navigate(to, { state })} className="self-start">
      <ArrowLeft className="size-4" /> {t(labelKey)}
    </Button>
  );
}

export function CompareChipBar({
  models,
  onRemove,
  onClear,
  onCompare,
  compareLabel,
}: {
  models: ArtificialAnalysisModel[];
  onRemove: (model: ArtificialAnalysisModel) => void;
  onClear: () => void;
  onCompare?: () => void;
  compareLabel?: string;
}) {
  const { t } = useTranslation();
  const canCompare = models.length >= 2;
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-between p-3 sm:p-4 rounded-lg border border-border bg-bg-secondary/50">
      <div className="flex flex-wrap gap-2 items-center">
        {models.map((model) => (
          <span
            key={modelId(model)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-card border border-border text-sm"
          >
            <span className="text-sm font-medium truncate max-w-[140px]">{model.short_name || model.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(model)}
              className="shrink-0 -mr-1"
              aria-label={`${t("remove")} ${model.short_name || model.name}`}
            >
              <X size={14} />
            </Button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClear}>
          <Trash2 size={14} /> {t("clear")}
        </Button>
        {onCompare && (
          <Button size="sm" variant="outline" onClick={onCompare} disabled={!canCompare}>
            <ArrowLeftRight size={14} /> {compareLabel ?? t("compareSelected")}
          </Button>
        )}
      </div>
      {onCompare && !canCompare && models.length > 0 && (
        <p className="text-xs text-text-secondary w-full">{t("compareLimit")}</p>
      )}
    </div>
  );
}

export function SegmentedGroup({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex gap-1 p-0.5 rounded-lg bg-bg-secondary", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardGrid({
  cols = 3,
  gap = 2,
  className,
  children,
}: {
  cols?: 2 | 3 | 4;
  gap?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        gap === 2 && "gap-2",
        gap === 3 && "gap-3",
        gap === 4 && "gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export function StatGrid({ columns = 4, children }: { columns?: 2 | 3 | 4; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{children}</div>;
}

export const InfoCard = memo(function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-text-primary">{title}</p>
        <div className="flex flex-col gap-2 min-w-0">{children}</div>
      </CardContent>
    </Card>
  );
});

export const InfoRow = memo(function InfoRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  compact?: boolean;
}) {
  const textSize = compact ? "text-xs sm:text-sm" : "text-sm";
  return (
    <div className={cn("flex flex-row justify-between min-w-0 py-1.5", compact ? "gap-2" : "gap-4")}>
      <p className={cn(textSize, "text-text-secondary truncate")}>{label}</p>
      <p className={cn(textSize, "font-mono tabular-nums text-right truncate text-text-primary font-medium")}>
        {value}
      </p>
    </div>
  );
});

const MODALITY_STYLES = {
  text: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  image: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  speech: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  video: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
} as const;

function ModalitySection({
  label,
  prefix,
  model,
  t,
}: {
  label: string;
  prefix: "input" | "output";
  model: ArtificialAnalysisModel;
  t: TFunction;
}) {
  const key = (m: string) => `${prefix}_modality_${m}` as keyof ArtificialAnalysisModel;
  return (
    <div>
      <div className="text-xs font-medium mb-2 text-text-secondary">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {(["text", "image", "speech", "video"] as const).map((m) =>
          model[key(m)] ? (
            <span key={m} className={`px-2.5 py-0.5 text-xs font-medium rounded-md ${MODALITY_STYLES[m]}`}>
              {t(`modality${m.charAt(0).toUpperCase() + m.slice(1)}` as Parameters<TFunction>[0])}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function ModelDetailContent({
  model,
  showBenchmarks = true,
}: {
  model: ArtificialAnalysisModel;
  showBenchmarks?: boolean;
}) {
  const { t } = useTranslation();
  const pricing = model.pricing;
  return (
    <DetailLayout>
      <StatGrid columns={4}>
        <StatCard label={t("intelligenceIndex")} value={formatScore(t, model.intelligence_index)} />
        <StatCard label={t("coding")} value={formatScore(t, model.coding_index)} />
        <StatCard label={t("agentic")} value={formatScore(t, model.agentic_index)} />
        <StatCard label={t("outputSpeed")} value={formatScore(t, getOutputSpeed(model))} />
      </StatGrid>
      <InfoGrid>
        <InfoCard title={t("modelInfo")}>
          <InfoRow compact label={t("creator")} value={orNA(model.model_creators?.name, t)} />
          <InfoRow compact label={t("releaseDate")} value={orNA(model.release_date, t)} />
          <InfoRow compact label={t("openWeights")} value={formatBoolean(t, model.is_open_weights)} />
          <InfoRow compact label={t("contextWindow")} value={formatTokens(model.context_window_tokens, t)} />
        </InfoCard>
        <InfoCard title={t("pricing")}>
          <InfoRow compact label={t("promptPrice")} value={formatPricePerMillion(pricing?.input, t)} />
          <InfoRow compact label={t("completionPrice")} value={formatPricePerMillion(pricing?.output, t)} />
          <InfoRow compact label={t("cacheHitPrice")} value={formatPricePerMillion(pricing?.cache_hit, t)} />
          <InfoRow compact label={t("blendedPrice")} value={formatPricePerMillion(model.blended_price, t)} />
        </InfoCard>
      </InfoGrid>
      {showBenchmarks && model.benchmarks && Object.values(model.benchmarks).some((v) => v != null) && (
        <InfoCard title={t("benchmarks")}>
          <StatGrid columns={4}>
            {Object.entries(model.benchmarks).map(([key, value]) => {
              const normalized = normalizePercent(value);
              return normalized == null ? null : (
                <StatCard key={key} label={benchmarkLabel(key, t)} value={formatScore(t, normalized)} />
              );
            })}
          </StatGrid>
        </InfoCard>
      )}
      <InfoCard title={t("modalities")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModalitySection label={t("inputModality")} prefix="input" model={model} t={t} />
          <ModalitySection label={t("outputModality")} prefix="output" model={model} t={t} />
        </div>
      </InfoCard>
    </DetailLayout>
  );
}

interface RankingNameCellProps {
  name: string;
  suffix?: React.ReactNode;
}

export const RankingNameCell = memo(function RankingNameCell({ name, suffix }: RankingNameCellProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <p className="text-sm font-semibold truncate flex-1 min-w-0">{name}</p>
      {suffix}
    </div>
  );
});

interface RightAlignedTextProps {
  children: ReactNode;
  className?: string;
}

export const RightAlignedText = memo(function RightAlignedText({ children, className }: RightAlignedTextProps) {
  return <p className={cn("overflow-hidden text-ellipsis whitespace-nowrap text-right", className)}>{children}</p>;
});

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  valueClassName?: string;
  trend?: "up" | "down" | "neutral";
}

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  trend,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent padding="sm" className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2 min-w-0">
          {Icon && (
            <span className="text-text-secondary shrink-0">
              <Icon className="size-4" />
            </span>
          )}
          <p className="text-[11px] sm:text-xs text-text-secondary font-medium uppercase tracking-wider truncate">{label}</p>
        </div>
        <p
          className={cn(
            "text-lg sm:text-xl font-bold tracking-tight break-words min-w-0",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            valueClassName,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
});

interface TabButtonProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  tabIndex?: number;
  "aria-controls"?: string;
}

export const TabButton = memo(function TabButton({
  active,
  onClick,
  children,
  className,
  size = "md",
  id,
  tabIndex,
  "aria-controls": ariaControls,
}: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={ariaControls}
      tabIndex={tabIndex ?? (active ? 0 : -1)}
      onClick={onClick}
      className={cn(
        "rounded-md font-medium transition-colors duration-150 whitespace-nowrap shrink-0",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        active
          ? "bg-bg-card text-text-primary shadow-sm border border-border"
          : "text-text-secondary hover:text-text-primary border border-transparent",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1",
        className,
      )}
    >
      {children}
    </button>
  );
});

export interface TabItem {
  id: string;
  label: string;
}

interface TabContainerProps {
  tabs: TabItem[];
  activeTab: string;
  className?: string;
  tabSize?: "sm" | "md";
  onTabChange: (tabId: string) => void;
  children: ((activeTab: string) => ReactNode) | ReactNode;
}

export function TabContainer({ tabs, activeTab, className, tabSize = "md", onTabChange, children }: TabContainerProps) {
  const content = typeof children === "function" ? children(activeTab) : children;

  const handleTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    onTabChange(tabs[nextIndex]!.id);
    document.getElementById(`tab-${tabs[nextIndex]!.id}`)?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-4 sm:gap-5", className)}>
      <SegmentedGroup
        className="p-1 w-fit max-w-full overflow-x-auto no-scrollbar"
        role="tablist"
        onKeyDown={handleTablistKeyDown}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            size={tabSize}
            tabIndex={activeTab === tab.id ? 0 : -1}
            aria-controls={activeTab === tab.id ? `panel-${tab.id}` : undefined}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </TabButton>
        ))}
      </SegmentedGroup>
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {content}
      </div>
    </div>
  );
}

import { memo, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Line,
  LineChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useTranslation } from "@/app/i18n";
import { Card, CardContent, Dot } from "@/app/components/ui";
import { PageSection } from "@/app/components/layout";
import { getModelColor, COOL_COLORS, chartTooltipStyle, formatShortNumber } from "@/shared/utils";
import { useElementWidth } from "@/app/hooks";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { HomeBarStat, HomeToolUsage } from "@/app/features/home/HomeView";

const ToolUsageShareDonut = memo(function ToolUsageShareDonut({
  total,
  rows,
}: {
  total: number;
  rows: Array<{ name: string; value: number; share: number }>;
}) {
  const { t, lang } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const center = hoveredIndex != null ? rows[hoveredIndex] : null;

  const percent = (v: number) =>
    v.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">{t("toolUsageShare")}</p>
      <p className="text-xs text-text-secondary -mt-1">{t("openRouterSource")}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">{t("notAvailable")}</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative w-full max-w-[220px] aspect-square shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={() => setHoveredIndex(null)} aria-label={t("toolUsageShare")}>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={68}
                  paddingAngle={1}
                  stroke="var(--bg-card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {rows.map((row, index) => (
                    <Cell
                      key={row.name}
                      fill={getModelColor(index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {center ? (
                <>
                  <span className="text-xs font-bold leading-none text-center max-w-full px-2 truncate">{center.name}</span>
                  <span className="text-base font-bold leading-none mt-1 font-mono">
                    {formatShortNumber(center.value)}
                  </span>
                  <span className="text-xs text-text-secondary leading-none mt-0.5">
                    {(center.share * 100).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold leading-none font-mono">{formatShortNumber(total)}</span>
                  <span className="text-xs text-text-secondary leading-none mt-0.5">{t("tokens")}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-0 flex-1 w-full">
            {rows.map((row, index) => (
              <div key={row.name} className="grid grid-cols-[10px_1fr_auto] gap-2.5 items-center min-w-0">
                <Dot color={getModelColor(index)} />
                <span className="text-sm truncate">{row.name}</span>
                <span className="text-sm font-semibold font-mono">{percent(row.share)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const IndexLineChart = memo(function IndexLineChart({ models }: { models: ArtificialAnalysisModel[] }) {
  const { t } = useTranslation();
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();
  const top10 = useMemo(
    () =>
      [...models]
        .filter((m) => m.intelligence_index != null)
        .sort((a, b) => (b.intelligence_index ?? 0) - (a.intelligence_index ?? 0))
        .slice(0, 10),
    [models],
  );
  const chartData = useMemo(
    () =>
      top10.map((m) => ({
        name: m.short_name || m.name.split("/").pop() || m.name,
        intelligence: m.intelligence_index ?? null,
        coding: m.coding_index ?? null,
        agentic: m.agentic_index ?? null,
      })),
    [top10],
  );
  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">
          {t("intelligenceIndex")} — {t("top10")}
        </p>
        <div ref={chartRef} className="w-full h-[200px]">
          {chartWidth > 0 && top10.length > 0 && (
            <LineChart
              width={chartWidth}
              height={200}
              data={chartData}
              margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={false} stroke="var(--border)" />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                stroke="var(--border)"
                domain={[0, 100]}
                tickCount={6}
                tickFormatter={(v: number) => Math.round(v).toString()}
              />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => Math.round(Number(value))} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="intelligence"
                name={t("intelligence")}
                stroke={getModelColor(0)}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="coding"
                name={t("coding")}
                stroke={getModelColor(1)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="agentic"
                name={t("agentic")}
                stroke={getModelColor(2)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const StatisticsSection = memo(function StatisticsSection({
  downloadStats,
  hallucinationStats,
  toolUsageShare,
}: {
  downloadStats: HomeBarStat[];
  hallucinationStats: HomeBarStat[];
  toolUsageShare: HomeToolUsage;
}) {
  const { t } = useTranslation();
  return (
    <PageSection title={t("statistics")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankedStatCard title={t("openSourceDownloadsStats")} source={t("huggingFaceSource")} rows={downloadStats} />
        <RankedStatCard title={t("hallucinationStats")} source={t("hallucinationSource")} rows={hallucinationStats} />
        <div className="md:col-span-1">
          <Card accent="top" className="h-full">
            <CardContent padding="md" className="h-full">
              <ToolUsageShareDonut total={toolUsageShare.total} rows={toolUsageShare.rows} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageSection>
  );
});

const RankedStatCard = memo(function RankedStatCard({
  title,
  source,
  rows,
}: {
  title: string;
  source: string;
  rows: HomeBarStat[];
}) {
  const { t } = useTranslation();
  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-1">{title}</p>
        <p className="text-xs text-text-secondary mb-3">{source}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("notAvailable")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={`${row.label}-${i}`} className="flex items-center gap-3 h-6">
                <span
                  className="text-xs font-bold w-5 text-center shrink-0"
                  style={{ color: COOL_COLORS[i % COOL_COLORS.length] }}
                >
                  {i + 1}
                </span>
                <span className="text-sm truncate min-w-0 flex-1">{row.label}</span>
                <span className="text-sm font-semibold font-mono shrink-0">{row.valueLabel}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

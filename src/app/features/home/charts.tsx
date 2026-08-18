import { memo, useMemo } from "react";
import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useTranslation } from "@/app/i18n";
import { Card, CardContent } from "@/app/components/ui";
import { PageSection } from "@/app/components/layout";
import { getModelColor, COOL_COLORS, chartTooltipStyle } from "@/shared/utils";
import { useElementWidth } from "@/app/hooks";
import type { ArtificialAnalysisModel } from "@/shared/types";
import type { HomeBarStat } from "@/app/features/home/HomeView";

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
      })),
    [top10],
  );
  return (
    <Card accent="top">
      <CardContent padding="md">
        <p className="text-sm font-semibold mb-3">
          {t("intelligenceIndex")} — {t("top10")}
        </p>
        <div ref={chartRef} className="w-full h-[220px] sm:h-[260px]">
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
}: {
  downloadStats: HomeBarStat[];
  hallucinationStats: HomeBarStat[];
}) {
  const { t } = useTranslation();
  return (
    <PageSection title={t("statistics")}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankedStatCard title={t("openSourceDownloadsStats")} source={t("huggingFaceSource")} rows={downloadStats} />
        <RankedStatCard title={t("hallucinationStats")} source={t("hallucinationSource")} rows={hallucinationStats} />
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
        <p className="text-sm sm:text-base font-semibold mb-1">{title}</p>
        <p className="text-xs text-text-secondary mb-3">{source}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("notAvailable")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={`${row.label}-${i}`} className="flex items-center gap-3 h-7">
                <span
                  className="text-xs sm:text-sm font-bold w-6 text-center shrink-0"
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

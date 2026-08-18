import { useMemo, useState } from "react";
import type { DataTableColumn } from "@/app/components/data";
import { DataTable } from "@/app/components/data";
import { useTranslation } from "@/app/i18n";
import { useFilteredData } from "@/app/hooks";

import { cn, formatDate } from "@/shared/utils";
import { useSuspenseOpenSourceReleases, useSuspenseArtificialRankings } from "@/app/api/queries";
import { SuspenseQuery, SearchInput } from "@/app/components/shared";
import { TabContainer, type TabItem, RightAlignedText } from "@/app/components/composite";
import { PageContainer, PageHeader } from "@/app/components/layout";
import type { OpenSourceModelEntry, ArtificialAnalysisModel } from "@/shared/types";

interface FeedEntry {
  id: string;
  name: string;
  date: string;
  ts: number;
  type: "new" | "update" | "opensource";
  source: "huggingface" | "artificial";
}

interface DatedModel {
  model: ArtificialAnalysisModel;
  time: number;
}

function useReleaseFeedEntries(openSourceReleases: OpenSourceModelEntry[]): FeedEntry[] {
  return useMemo(() => {
    const seen = new Map<string, FeedEntry>();
    for (const m of openSourceReleases) {
      const name = m.id.split("/").pop() || m.id;
      if (m.createdAt) {
        const ts = Date.parse(m.createdAt);
        if (Number.isFinite(ts)) {
          const key = `${m.id}|opensource|${ts}`;
          if (!seen.has(key))
            seen.set(key, {
              id: m.id,
              name,
              date: new Date(ts).toISOString().split("T")[0]!,
              ts,
              type: "opensource",
              source: "huggingface",
            });
        }
      }
      if (m.lastModified && m.lastModified !== m.createdAt) {
        const ts = Date.parse(m.lastModified);
        if (Number.isFinite(ts)) {
          const key = `${m.id}_mod|update|${ts}`;
          if (!seen.has(key))
            seen.set(key, {
              id: m.id + "_mod",
              name,
              date: new Date(ts).toISOString().split("T")[0]!,
              ts,
              type: "update",
              source: "huggingface",
            });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.ts - a.ts);
  }, [openSourceReleases]);
}

function useReleaseDateRows(artificialRankings: ArtificialAnalysisModel[]): DatedModel[] {
  return useMemo(
    () =>
      artificialRankings
        .map((model) => ({ model, time: model.release_date ? Date.parse(`${model.release_date}T00:00:00Z`) : NaN }))
        .filter((item): item is DatedModel => Number.isFinite(item.time))
        .sort((a, b) => b.time - a.time),
    [artificialRankings],
  );
}

const getFeedSearchFields = (e: FeedEntry) => [e.name, e.id];
const getFeedRowId = (e: FeedEntry) => e.id;

function FeedTab({ allEntries }: { allEntries: FeedEntry[] }) {
  const { t, lang } = useTranslation();
  const feedRows = useFilteredData(allEntries, getFeedSearchFields);

  const feedColumns = useMemo<DataTableColumn<FeedEntry>[]>(() => {
    const getTypeMeta = (type: FeedEntry["type"]) => {
      switch (type) {
        case "update":
          return { label: t("releaseUpdate"), color: "text-info" };
        case "opensource":
          return { label: t("releaseOpenSource"), color: "text-warning" };
        default:
          return { label: type, color: "text-text-secondary" };
      }
    };

    return [
      {
        id: "model",
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{row.name}</p>
            <div className="flex md:hidden mt-1 items-center gap-1.5">
              <span className={cn("text-xs font-semibold", getTypeMeta(row.type).color)}>
                {getTypeMeta(row.type).label}
              </span>
              <span className="text-xs text-text-tertiary">{formatDate(row.ts, lang)}</span>
            </div>
          </div>
        ),
      },
      {
        id: "date",
        align: "right",
        width: 100,
        hiddenMd: true,
        cell: (row) => <span className="text-xs">{formatDate(row.ts, lang)}</span>,
      },
      {
        id: "type",
        align: "right",
        width: 140,
        hiddenMd: true,
        cell: (row) => {
          const meta = getTypeMeta(row.type);
          return <span className={cn("text-xs font-semibold", meta.color)}>{meta.label}</span>;
        },
      },
    ];
  }, [t, lang]);

  return <DataTable data={feedRows} columns={feedColumns} getRowId={getFeedRowId} />;
}

function ReleaseDatesTab({ releaseRows }: { releaseRows: DatedModel[] }) {
  const { t, lang } = useTranslation();

  const releaseColumns = useMemo<DataTableColumn<DatedModel>[]>(
    () => [
      {
        id: "model",
        cell: (row) => <span className="text-sm font-semibold truncate min-w-0">{row.model.name}</span>,
      },
      {
        id: "creator",
        align: "right",
        width: "24%",
        hiddenMd: true,
        cell: (row) => <RightAlignedText>{row.model.model_creators?.name || t("notAvailable")}</RightAlignedText>,
      },
      {
        id: "releaseDate",
        align: "right",
        width: "18%",
        hiddenMd: true,
        cell: (row) => <span className="text-sm">{formatDate(row.time, lang)}</span>,
      },
    ],
    [t, lang],
  );

  return <DataTable data={releaseRows} columns={releaseColumns} />;
}

function ReleasesContent() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"feed" | "release-dates">("feed");
  const { data: openSourceReleases } = useSuspenseOpenSourceReleases();
  const { data: artificialRankings } = useSuspenseArtificialRankings();

  const allEntries = useReleaseFeedEntries(openSourceReleases);
  const releaseRows = useReleaseDateRows(artificialRankings);

  const tabs: TabItem[] = useMemo(
    () => [
      { id: "feed", label: t("releaseOpenSource") },
      { id: "release-dates", label: t("releaseModel") },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("releases")}
        description={mode === "feed" ? t("releaseDataSource") : t("artificialSource")}
        actions={<SearchInput />}
      />
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-md">
          {mode === "feed"
            ? t("events", { count: allEntries.length })
            : t("modelsTotal", { count: releaseRows.length })}
        </span>
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={mode}
        onTabChange={(id) => setMode(id as "feed" | "release-dates")}
        tabSize="sm"
      >
        {mode === "feed" ? <FeedTab allEntries={allEntries} /> : <ReleaseDatesTab releaseRows={releaseRows} />}
      </TabContainer>
    </PageContainer>
  );
}

export function ReleasesView() {
  return (
    <SuspenseQuery>
      <ReleasesContent />
    </SuspenseQuery>
  );
}

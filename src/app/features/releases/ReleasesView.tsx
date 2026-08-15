import { useMemo, useState } from "react";
import type { DataTableColumn } from "../../components/data/DataTable";
import { DataTable } from "../../components/data/DataTable";
import { useTranslation } from "../../i18n";
import { useDocumentTitle } from "../../hooks";

import { cn } from "../../../shared/utils";
import { useFilteredData } from "../../hooks";
import { useSuspenseOpenSourceReleases, useSuspenseArtificialRankings } from "../../api/queries";
import { SuspenseQuery } from "../../components/feedback/SuspenseQuery";
import { TabContainer, type TabItem } from "../../components/composite";
import { useReleaseFeedEntries, useReleaseDateRows, type FeedEntry, type DatedModel } from "./useReleaseData";
import { PageContainer, PageHeader } from "../../components/layout";
import { RightAlignedText } from "../../components/composite";
import { SearchInput } from "../home/SearchInput";
import { formatDate } from "../../../shared/utils/format";

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
        header: t("modelNameOrId"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-medium break-words overflow-wrap-anywhere">{row.name}</p>
            <div className="flex md:hidden mt-1 items-center gap-1.5">
              <span className={cn("text-xs font-semibold", getTypeMeta(row.type).color)}>{getTypeMeta(row.type).label}</span>
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
      { id: "model", cell: (row) => <span className="text-sm font-semibold break-words min-w-0">{row.model.name}</span> },
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

function ReleasesContent({ defaultMode, lockedMode }: { defaultMode: "feed" | "release-dates"; lockedMode: boolean }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"feed" | "release-dates">(defaultMode);
  const { data: openSourceReleases } = useSuspenseOpenSourceReleases();
  const { data: artificialRankings } = useSuspenseArtificialRankings();

  const allEntries = useReleaseFeedEntries(openSourceReleases);
  const releaseRows = useReleaseDateRows(artificialRankings);

  const tabs: TabItem[] = useMemo(
    () => [
      { id: "feed", label: t("releases") },
      { id: "release-dates", label: t("scoreRelease") },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t(lockedMode ? "scoreRelease" : "releases")} description={mode === "feed" ? t("releaseDataSource") : t("artificialSource")} actions={<SearchInput />} />
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-md">
          {mode === "feed" ? t("events", { count: allEntries.length }) : t("modelsTotal", { count: releaseRows.length })}
        </span>
      </div>
      {lockedMode ? (
        <ReleaseDatesTab releaseRows={releaseRows} />
      ) : (
        <TabContainer tabs={tabs} activeTab={mode} onTabChange={(id) => setMode(id as "feed" | "release-dates")} tabSize="sm">
          {mode === "feed" ? <FeedTab allEntries={allEntries} /> : <ReleaseDatesTab releaseRows={releaseRows} />}
        </TabContainer>
      )}
    </PageContainer>
  );
}

export function ReleasesView({ defaultMode, lockedMode = false }: { defaultMode?: "feed" | "release-dates"; lockedMode?: boolean }) {
  const { t } = useTranslation();
  useDocumentTitle(t("releases"));
  return (
    <SuspenseQuery>
      <ReleasesContent defaultMode={defaultMode || "feed"} lockedMode={lockedMode} />
    </SuspenseQuery>
  );
}

import { useMemo, useState } from "react";
import { ExternalLink, Clock, Search } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useDocumentTitle } from "../../hooks";
import type { TranslationKey } from "../../../shared/i18n";
import { Card } from "../../components/ui";
import { Pagination } from "../../components/ui";
import { useNewsByCategory } from "../../api/queries";
import { Spinner } from "../../components/feedback/SuspenseQuery";
import { safeHref, formatRelativeTime } from "../../../shared/utils/format";
import { COOL_COLORS } from "../../../shared/utils";
import { TabContainer, type TabItem } from "../../components/composite";
import type { NewsItem } from "../../../shared/types";
import { useIsMobile } from "../../hooks";
import { PageContainer, PageHeader } from "../../components/layout";

const CATEGORIES: { id: string; labelKey: TranslationKey; color: string }[] = [
  { id: "industry", labelKey: "catIndustry", color: COOL_COLORS[0]! },
  { id: "opensource", labelKey: "catOpenSource", color: COOL_COLORS[1]! },
  { id: "hardware", labelKey: "catHardware", color: COOL_COLORS[2]! },
  { id: "funding", labelKey: "catFunding", color: COOL_COLORS[3]! },
];

function NewsList({ news, color, isLoading, isError }: { news: NewsItem[]; color: string; isLoading: boolean; isError: boolean }) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useIsMobile();
  const itemsPerPage = isMobile ? 10 : 20;
  const totalPages = Math.max(1, Math.ceil(news.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const currentNews = news.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  if (isLoading) return <Spinner />;

  if (isError) {
    return (
      <Card className="text-sm p-6 text-center" style={{ color: "var(--destructive)" }}>
        {t("newsLoadFailed")}
      </Card>
    );
  }

  if (news.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-text-secondary">
        <Search size={24} className="mb-2 opacity-50" />
        <p className="text-sm">{t("noResults")}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {currentNews.map((item) => (
        <a key={item.id} href={safeHref(item.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="group block" aria-label={`${item.title} - ${item.source}`}>
          <Card className="p-4 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-semibold text-text-primary leading-relaxed group-hover:text-accent transition-colors">{item.title}</h3>
              <ExternalLink size={14} className="shrink-0 text-text-secondary mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{item.source}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock size={12} />
                <span>{formatRelativeTime(item.pubDate, t)}</span>
              </div>
            </div>
          </Card>
        </a>
      ))}
      {totalPages > 1 && (
        <div className="mt-2 flex justify-center">
          <Pagination page={safePage} totalPages={totalPages} onChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}

function NewsCategoryContent({ categoryId, color }: { categoryId: string; color: string }) {
  const result = useNewsByCategory(categoryId);
  return <NewsList key={categoryId} news={result.data || []} color={color} isLoading={result.isLoading} isError={result.isError} />;
}

export function NewsView() {
  const { t } = useTranslation();
  useDocumentTitle(t("aiNews"));
  const [activeCategory, setActiveCategory] = useState("industry");

  const activeColor = CATEGORIES.find((c) => c.id === activeCategory)?.color ?? COOL_COLORS[0]!;

  const tabs: TabItem[] = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        id: cat.id,
        label: t(cat.labelKey),
      })),
    [t],
  );

  return (
    <PageContainer>
      <PageHeader title={t("aiNews")} />
      <TabContainer tabs={tabs} activeTab={activeCategory} tabSize="sm" onTabChange={setActiveCategory}>
        <NewsCategoryContent categoryId={activeCategory} color={activeColor} />
      </TabContainer>
    </PageContainer>
  );
}

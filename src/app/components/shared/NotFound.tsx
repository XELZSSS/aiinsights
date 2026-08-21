import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { PageContainer } from "@/app/components/layout";

/** 404 page with a link back to the home route. */
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

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui";
import { BackButton } from "../../components/composite";
import { CompareChipBar } from "../../components/composite";

import { useTranslation } from "../../i18n";
import { useCompareStore } from "../../stores";
import { useArtificialRankings } from "../../api/queries";
import { Spinner } from "../../components/feedback/SuspenseQuery";
import { modelId } from "../../../shared/utils";
import type { TranslationKey } from "../../../shared/i18n";
import type { ArtificialAnalysisModel } from "../../../shared/types";
import { PageContainer, PageHeader } from "../../components/layout";

function useCompareModels(): ArtificialAnalysisModel[] | null {
  const compareIds = useCompareStore((s) => s.compareIds);
  const rankingsQ = useArtificialRankings();
  return useMemo(() => {
    if (rankingsQ.isPending || !rankingsQ.data) return null;
    return compareIds.map((id) => rankingsQ.data.find((m) => modelId(m) === id)).filter((m): m is ArtificialAnalysisModel => !!m);
  }, [compareIds, rankingsQ.data, rankingsQ.isPending]);
}

interface ComparePageLayoutProps {
  backLabelKey: TranslationKey;
  backTo: string;
  backState?: Record<string, unknown>;
  title: string;
  children: (models: ArtificialAnalysisModel[]) => React.ReactNode;
}

export function ComparePageLayout({ backLabelKey, backTo, backState, title, children }: ComparePageLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const removeCompareModel = useCompareStore((s) => s.removeCompareModel);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const models = useCompareModels();

  if (models === null) return <Spinner />;

  if (models.length < 2) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 items-center py-16">
          <p className="text-sm text-text-secondary">{t("compareNeedsTwo")}</p>
          <Button size="sm" variant="outline" onClick={() => navigate(backTo)}>
            {t("backToList")}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-5 min-w-0">
        <BackButton labelKey={backLabelKey} to={backTo} state={backState} />
        <PageHeader title={title} description={t("artificialSource")} />
        <CompareChipBar
          models={models}
          onRemove={removeCompareModel}
          onClear={() => {
            clearCompare();
            navigate(backTo);
          }}
        />
        {children(models)}
      </div>
    </PageContainer>
  );
}

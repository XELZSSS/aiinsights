import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui";
import { useTranslation } from "@/app/i18n";
import type { TranslationKey } from "@/shared/i18n";

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

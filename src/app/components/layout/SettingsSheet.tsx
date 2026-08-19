import { memo, type ReactNode } from "react";
import { Languages, Moon, Sun, X } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useThemeStore } from "@/app/stores";
import { Button, Sheet } from "@/app/components/ui";
import { SourcesStatusList } from "@/app/components/shared";
import { REPO_URL } from "@/shared/config";

const SettingRow = memo(function SettingRow({
  icon,
  label,
  button,
}: {
  icon: ReactNode;
  label: string;
  button: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm">{label}</p>
      </div>
      {button}
    </div>
  );
});

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, toggleLang } = useTranslation();
  const themeMode = useThemeStore((s) => s.themeMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-base font-semibold">{t("settings")}</p>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close")}>
            <X className="size-4" />
          </Button>
        </div>
        <SettingRow
          icon={<Languages size={16} className="text-text-secondary" />}
          label={t("language")}
          button={
            <Button variant="outline" size="sm" className="w-24" onClick={toggleLang}>
              {lang === "zh" ? "简体中文" : "English"}
            </Button>
          }
        />
        <SettingRow
          icon={
            themeMode === "light" ? (
              <Moon size={16} className="text-text-secondary" />
            ) : (
              <Sun size={16} className="text-text-secondary" />
            )
          }
          label={t("themeToggle")}
          button={
            <Button variant="outline" size="sm" className="w-24" onClick={toggleTheme}>
              {themeMode === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </Button>
          }
        />
        <SettingRow
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          }
          label="GitHub"
          button={
            <Button
              variant="outline"
              size="sm"
              className="w-24"
              onClick={() => window.open(REPO_URL, "_blank", "noopener,noreferrer")}
            >
              GitHub
            </Button>
          }
        />
        <div className="my-1 border-t border-border" />
        <div>
          <p className="text-sm font-semibold mb-2">{t("sourceStatus")}</p>
          <SourcesStatusList />
        </div>
      </div>
    </Sheet>
  );
}

import { useCallback, useLayoutEffect, useState, type ReactNode } from "react";
import { useThemeStore } from "@/app/stores";
import { useTranslation } from "@/app/i18n";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { SettingsSheet } from "./SettingsSheet";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.themeMode);
  const { t } = useTranslation();

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeMore = useCallback(() => setMobileMoreOpen(false), []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
  }, [themeMode]);

  return (
    <div className="h-dvh flex flex-col bg-bg-primary overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-bg-primary focus:border focus:border-border focus:rounded-md focus:text-sm"
      >
        {t("skipToContent")}
      </a>
      <DesktopNav onSettingsOpen={() => setSettingsOpen(true)} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] pt-0 md:pt-16 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-4"
      >
        {children}
      </main>
      <MobileNav onMoreOpen={() => setMobileMoreOpen(true)} />
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
      <MobileMoreSheet open={mobileMoreOpen} onClose={closeMore} onSettingsOpen={() => setSettingsOpen(true)} />
    </div>
  );
}

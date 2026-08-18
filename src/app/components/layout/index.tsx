import { memo, useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Award, Megaphone, Newspaper, Settings, MoreHorizontal, Languages, Moon, Sun, X } from "lucide-react";
import { Sheet, Button } from "@/app/components/ui";
import { useTranslation } from "@/app/i18n";
import { useThemeStore } from "@/app/stores";
import { REPO_URL } from "@/shared/config";
import { cn } from "@/shared/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string[];
}

function useNavigation() {
  const { t } = useTranslation();

  return useMemo(() => {
    const primary: NavItem[] = [
      { path: "/", label: t("home"), icon: <Home size={18} /> },
      {
        path: "/models",
        label: t("rankings"),
        icon: <Award size={18} />,
        matchPrefix: ["/model/", "/compare", "/price-compare"],
      },
    ];
    const secondary: NavItem[] = [
      { path: "/releases", label: t("releases"), icon: <Megaphone size={18} /> },
      { path: "/news", label: t("aiNews"), icon: <Newspaper size={18} /> },
    ];
    const all = [...primary, ...secondary];
    const mobilePrimary = primary;
    const mobilePrimaryPaths = new Set(mobilePrimary.map((n) => n.path));
    const mobileMore = all.filter((n) => !mobilePrimaryPaths.has(n.path));

    return { all, mobilePrimary, mobileMore };
  }, [t]);
}

function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.path) return true;
  if (item.matchPrefix) return item.matchPrefix.some((p) => pathname.startsWith(p));
  return false;
}

function DesktopNav({ onSettingsOpen }: { onSettingsOpen: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { all } = useNavigation();
  const { t } = useTranslation();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center border-b border-border bg-nav-bg backdrop-blur-lg">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 flex items-center">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label={t("home")}
          className="flex items-center gap-2 mr-8 shrink-0"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="size-5 text-accent" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.59 7.41l4.94 3.54L4.59 24zm0-7.41v6.36l9.53 5.29 4.59-3.52zm0 24l14.82-8.47v-6.7Z" />
          </svg>
          <span className="text-sm sm:text-base font-bold">AIInsights</span>
        </button>
        <div className="flex items-center gap-1.5">
          {all.map((item) => {
            const active = isNavActive(pathname, item);
            return (
              <button
                type="button"
                key={item.path}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.path)}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active ? "text-accent bg-accent-light" : "text-text-secondary hover:text-text-primary hover:bg-hover"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <button
            type="button"
            aria-label={t("settings")}
            onClick={onSettingsOpen}
            className="p-2 text-text-secondary hover:text-text-primary rounded-md hover:bg-hover transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function MobileNav({ onMoreOpen }: { onMoreOpen: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mobilePrimary, mobileMore } = useNavigation();

  const isMoreActive = mobileMore.some((n) => isNavActive(pathname, n));

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-30 flex h-14 items-center bg-bg-card border-t border-border pb-[env(safe-area-inset-bottom,0px)]">
      {mobilePrimary.map((item) => {
        const active = isNavActive(pathname, item);
        return (
          <button
            type="button"
            key={item.path}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-accent" : "text-text-secondary"}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMoreOpen}
        aria-label={t("more")}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isMoreActive ? "text-accent" : "text-text-secondary"}`}
      >
        <MoreHorizontal size={18} />
        <span>{t("more")}</span>
      </button>
    </nav>
  );
}

function MobileMoreSheet({
  open,
  onClose,
  onSettingsOpen,
}: {
  open: boolean;
  onClose: () => void;
  onSettingsOpen: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { all, mobileMore } = useNavigation();

  const currentNavLabel = all.find((n) => n.path === pathname)?.label || t("home");

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-2 pt-[5px] pb-[3px]">
        <p className="text-sm font-semibold">{t("more")}</p>
        <p className="text-xs text-text-secondary">{currentNavLabel}</p>
      </div>
      <nav className="py-1 overflow-y-auto">
        {mobileMore.map((item) => (
          <button
            type="button"
            key={item.path}
            onClick={() => {
              onClose();
              navigate(item.path);
            }}
            className={`w-full flex items-center gap-2 px-2 py-2 text-sm text-left ${pathname === item.path ? "bg-selected" : ""} hover:bg-hover`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <div className="my-1" />
        <button
          type="button"
          onClick={() => {
            onClose();
            onSettingsOpen();
          }}
          className="w-full flex items-center gap-2 p-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-hover"
        >
          <Settings size={18} />
          <span>{t("settings")}</span>
        </button>
      </nav>
    </Sheet>
  );
}

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

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      </div>
    </Sheet>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-5 sm:mb-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-text-primary break-words min-w-0">{title}</h1>
        {description && <p className="text-sm sm:text-base text-text-secondary mt-1">{description}</p>}
      </div>
      {actions && <div className="flex w-full sm:w-auto items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      {title && (
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="w-1 h-4 sm:h-5 rounded-full bg-accent shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">{title}</h2>
          {description && <span className="text-xs sm:text-sm text-text-secondary ml-1">{description}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

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

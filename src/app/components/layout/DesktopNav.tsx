import { useLocation, useNavigate } from "react-router";
import { Settings } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useNavigation, isNavActive } from "./navigation";

interface DesktopNavProps {
  onSettingsOpen: () => void;
}

export function DesktopNav({ onSettingsOpen }: DesktopNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { all } = useNavigation();
  const { t } = useTranslation();

  return (
    <nav className="hidden md:flex h-14 shrink-0 items-center border-b border-border bg-nav-bg backdrop-blur-lg">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 flex items-center">
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
                className={`relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap active:bg-hover ${
                  active ? "text-accent bg-accent-light" : "text-text-secondary hover:text-text-primary hover:bg-hover"
                }`}
              >
                {item.label}
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

import { useLocation, useNavigate } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useNavigation, isNavActive } from "./navigation";

interface MobileNavProps {
  onMoreOpen: () => void;
}

export function MobileNav({ onMoreOpen }: MobileNavProps) {
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

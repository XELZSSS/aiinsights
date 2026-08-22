import { useLocation, useNavigate } from "react-router";
import { useNavigation } from "./navigation";
import { Sheet } from "@/app/components/ui";
import type { NavItem } from "./navigation";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

const tileClass = (active: boolean) =>
  `flex flex-col items-center gap-1.5 w-20 py-3 rounded-xl text-xs font-medium transition-colors ${
    active ? "bg-selected text-accent" : "text-text-secondary hover:bg-hover"
  }`;

/** Compact floating "More" menu on mobile: icon-tile grid hovering above the bottom nav. */
export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mobileMore } = useNavigation();

  return (
    <Sheet open={open} onClose={onClose} className="w-auto mb-24 rounded-2xl p-2">
      <nav className="flex gap-1">
        {mobileMore.map((item) => (
          <NavTile
            key={item.path}
            item={item}
            active={pathname === item.path}
            onClick={() => {
              onClose();
              navigate(item.path);
            }}
          />
        ))}
      </nav>
    </Sheet>
  );
}

function NavTile({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={tileClass(active)}>
      <span className="[&>svg]:size-[22px]">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

// True if the click/keydown originated in an interactive element; used to avoid toggling
// row expansion when the user interacts with a button/link/input inside the row.
function isFromInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, input, select, textarea") !== null;
}

/** Shared a11y/interaction props for an expandable row (works for both <tr> and card containers). */
export function expandableRowProps(isExpandable: boolean, isExpanded: boolean, toggle: () => void) {
  if (!isExpandable) return {};
  return {
    "aria-expanded": isExpanded,
    role: "button" as const,
    tabIndex: 0,
    onClick: (e: ReactMouseEvent) => {
      if (!isFromInteractive(e.target)) toggle();
    },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (isFromInteractive(e.target)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
  };
}

/** Rotating disclosure chevron shown on expandable rows. */
export function Chevron({ isExpanded, size, className }: { isExpanded: boolean; size: number; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 text-text-secondary transition-transform duration-200",
        isExpanded && "rotate-90",
        className,
      )}
    >
      <ChevronRight size={size} />
    </span>
  );
}

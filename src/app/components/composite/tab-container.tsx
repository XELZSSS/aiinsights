import { memo, type KeyboardEvent, type ReactNode } from "react";
import { SegmentedGroup } from "./layout";
import { cn } from "@/shared/utils";

interface TabButtonProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  tabIndex?: number;
  "aria-controls"?: string;
}

export const TabButton = memo(function TabButton({
  active,
  onClick,
  children,
  className,
  size = "md",
  id,
  tabIndex,
  "aria-controls": ariaControls,
}: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={ariaControls}
      tabIndex={tabIndex ?? (active ? 0 : -1)}
      onClick={onClick}
      className={cn(
        "rounded-md font-medium transition-colors duration-150 whitespace-nowrap shrink-0",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        active
          ? "bg-bg-card text-text-primary shadow-sm border border-border"
          : "text-text-secondary hover:text-text-primary border border-transparent",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1",
        className,
      )}
    >
      {children}
    </button>
  );
});

export interface TabItem {
  id: string;
  label: string;
}

interface TabContainerProps {
  tabs: TabItem[];
  activeTab: string;
  className?: string;
  tabSize?: "sm" | "md";
  onTabChange: (tabId: string) => void;
  children: ((activeTab: string) => ReactNode) | ReactNode;
}

export function TabContainer({ tabs, activeTab, className, tabSize = "md", onTabChange, children }: TabContainerProps) {
  const content = typeof children === "function" ? children(activeTab) : children;

  const handleTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    onTabChange(tabs[nextIndex]!.id);
    document.getElementById(`tab-${tabs[nextIndex]!.id}`)?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-4 sm:gap-5", className)}>
      <SegmentedGroup
        className="p-1 w-fit max-w-full overflow-x-auto no-scrollbar"
        role="tablist"
        onKeyDown={handleTablistKeyDown}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            size={tabSize}
            tabIndex={activeTab === tab.id ? 0 : -1}
            aria-controls={activeTab === tab.id ? `panel-${tab.id}` : undefined}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </TabButton>
        ))}
      </SegmentedGroup>
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {content}
      </div>
    </div>
  );
}

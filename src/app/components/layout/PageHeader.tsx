import { type ReactNode } from "react";
import { cn } from "@/shared/utils";

/** Page title block: stacks on mobile, becomes a row with actions on wider screens. */
export function PageHeader({
  title,
  description,
  actions,
  compact,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4",
        compact ? "mb-4" : "mb-5 sm:mb-6",
      )}
    >
      <div>
        <h1
          className={cn(
            "font-bold tracking-tight text-text-primary break-words min-w-0",
            compact ? "text-xl sm:text-2xl" : "text-xl sm:text-3xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn("text-text-secondary mt-1", compact ? "text-xs sm:text-sm" : "text-sm sm:text-base")}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex w-full sm:w-auto items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

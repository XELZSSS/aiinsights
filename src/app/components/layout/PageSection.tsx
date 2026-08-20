import { type ReactNode } from "react";
import { cn } from "@/shared/utils";

/** Section with an accent-bar heading, optional description, and consistent bottom spacing. */
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

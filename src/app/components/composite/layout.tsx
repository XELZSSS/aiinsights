import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

export function SegmentedGroup({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex gap-1 p-0.5 rounded-lg bg-bg-secondary", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardGrid({
  cols = 3,
  gap = 2,
  className,
  children,
}: {
  cols?: 2 | 3 | 4;
  gap?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        gap === 2 && "gap-2",
        gap === 3 && "gap-3",
        gap === 4 && "gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export function StatGrid({ columns = 4, children }: { columns?: 2 | 3 | 4; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{children}</div>;
}

import { memo, type ComponentType, type ReactNode } from "react";
import { Card, CardContent } from "@/app/components/ui";
import { cn } from "@/shared/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  valueClassName?: string;
  trend?: "up" | "down" | "neutral";
}

/** Compact metric card used in stat grids; `trend` tints the value to signal up/down. */
export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  trend,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent padding="sm" className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2 min-w-0">
          {Icon && (
            <span className="text-text-secondary shrink-0">
              <Icon className="size-4" />
            </span>
          )}
          <p className="text-[11px] sm:text-xs text-text-secondary font-medium uppercase tracking-wider truncate">
            {label}
          </p>
        </div>
        <p
          className={cn(
            "text-lg sm:text-xl font-bold tracking-tight break-words min-w-0",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            valueClassName,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
});

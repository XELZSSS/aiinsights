import { memo } from "react";
import { cn } from "@/shared/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: "top" | "left" | "none";
}

/** Card container with an optional coloured accent bar on the top or left edge. */
export const Card = memo(function Card({ children, className, accent = "none", ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-bg-card transition-shadow duration-200", className)}
      {...props}
    >
      {accent === "top" && (
        <>
          <div className="h-1 bg-accent shrink-0" />
          {children}
        </>
      )}
      {accent === "left" && (
        <div className="flex min-w-0">
          <div className="w-1 bg-accent shrink-0" />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      )}
      {accent === "none" && children}
    </div>
  );
});

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

export const CardContent = memo(function CardContent({
  className,
  children,
  padding = "md",
  ...props
}: CardContentProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        padding === "sm" && "p-3.5 sm:p-4",
        padding === "md" && "p-4 sm:p-5",
        padding === "lg" && "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

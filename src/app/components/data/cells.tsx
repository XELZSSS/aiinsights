import { memo, type ReactNode } from "react";
import { cn } from "@/shared/utils";

interface RankingNameCellProps {
  name: string;
  suffix?: React.ReactNode;
}

/** Model name cell for ranking rows; truncates and can carry a trailing element (e.g. a chip). */
export const RankingNameCell = memo(function RankingNameCell({ name, suffix }: RankingNameCellProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <p className="text-sm font-semibold truncate flex-1 min-w-0">{name}</p>
      {suffix}
    </div>
  );
});

interface RightAlignedTextProps {
  children: ReactNode;
  className?: string;
}

/** Right-aligned text that ellipsizes instead of wrapping, for table/value columns. */
export const RightAlignedText = memo(function RightAlignedText({ children, className }: RightAlignedTextProps) {
  return <p className={cn("overflow-hidden text-ellipsis whitespace-nowrap text-right", className)}>{children}</p>;
});

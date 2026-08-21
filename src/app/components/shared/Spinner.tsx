import { memo } from "react";
import { Loader2 } from "lucide-react";

/** Centered loading spinner with an optional label. */
export const Spinner = memo(function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
});

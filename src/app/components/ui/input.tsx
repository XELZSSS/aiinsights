import { cn } from "@/shared/utils";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  className?: string;
}

// Hide the native number-input spinners (webkit + Firefox) for a cleaner field.
const noSpinners =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Text/number input; number fields have native spinners hidden via `noSpinners`. */
export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 px-3 text-sm rounded-md border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:border-text-tertiary",
        type === "number" && noSpinners,
        className,
      )}
      {...props}
    />
  );
}

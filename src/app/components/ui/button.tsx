import { memo } from "react";
import { cn } from "@/shared/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "icon";
}

const baseClass =
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<string, string> = {
  default: "bg-primary text-bg-primary hover:opacity-90",
  outline: "border border-border text-text-primary hover:bg-hover",
  ghost: "text-text-primary hover:bg-hover",
  link: "text-text-primary underline-offset-4 hover:underline",
};

const sizeClass: Record<string, string> = {
  default: "h-10 px-5 text-sm rounded-md",
  sm: "h-8 px-3 text-xs rounded-md",
  icon: "size-9 rounded-md",
};

/** Shared button with variant/size presets; resets the default form submit type. */
export const Button = memo(function Button({
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type="button" className={cn(baseClass, variantClass[variant], sizeClass[size], className)} {...props}>
      {children}
    </button>
  );
});

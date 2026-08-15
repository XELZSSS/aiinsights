import { memo, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../shared/utils";
import { useTranslation } from "../../i18n";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "ghost-icon";
  size?: "default" | "sm" | "icon";
}

const baseClass = "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<string, string> = {
  default: "bg-primary text-bg-primary hover:opacity-90",
  outline: "border border-border text-text-primary hover:bg-hover",
  ghost: "text-text-primary hover:bg-hover",
  "ghost-icon": "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-hover",
  link: "text-text-primary underline-offset-4 hover:underline",
};

const sizeClass: Record<string, string> = {
  default: "h-9 px-4 text-sm rounded-md",
  sm: "h-7 px-2.5 text-xs rounded-md",
  icon: "size-8 rounded-md",
};

export const Button = memo(function Button({ variant = "default", size = "default", className, children, ...props }: ButtonProps) {
  return (
    <button type="button" className={cn(baseClass, variantClass[variant], sizeClass[size], className)} {...props}>
      {children}
    </button>
  );
});

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: "top" | "left" | "none";
}

export const Card = memo(function Card({ children, className, accent = "none", ...props }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-bg-card transition-shadow duration-200", className)} {...props}>
      {accent === "top" && (
        <>
          <div className="h-1 bg-gradient-to-r from-accent to-info shrink-0" />
          {children}
        </>
      )}
      {accent === "left" && (
        <div className="flex min-w-0">
          <div className="w-1 bg-gradient-to-b from-accent to-info shrink-0" />
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

export const CardContent = memo(function CardContent({ className, children, padding = "md", ...props }: CardContentProps) {
  return (
    <div className={cn("w-full min-w-0", padding === "sm" && "p-3", padding === "md" && "p-4", padding === "lg" && "p-5", className)} {...props}>
      {children}
    </div>
  );
});

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  className?: string;
}

const noSpinners = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-8 px-2.5 text-sm rounded-md border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:border-text-tertiary",
        type === "number" && noSpinners,
        className,
      )}
      {...props}
    />
  );
}

interface BadgeProps {
  variant?: "default" | "outline";
  className?: string;
  children?: ReactNode;
}

export const Badge = memo(function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-semibold leading-[18px] px-2 py-0.5 rounded-md transition-colors",
        variant === "outline" ? "border border-border text-text-primary" : "bg-bg-tertiary text-text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
});

export const TagBadge = memo(function TagBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center text-[11px] leading-[16px] px-1.5 py-0.5 rounded-[4px] border border-border bg-bg-secondary text-text-secondary">{children}</span>
  );
});

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination = memo(function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" size="icon" aria-label={t("previousPage")} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} />
      </Button>
      <span className="text-sm text-text-secondary tabular-nums" aria-live="polite">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="icon" aria-label={t("nextPage")} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={16} />
      </Button>
    </div>
  );
});

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, children, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const timer = setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", handler);
      clearTimeout(timer);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn("relative z-50 w-full max-w-md rounded-t-xl sm:rounded-xl border border-border bg-bg-primary shadow-lg", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
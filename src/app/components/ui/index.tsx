import { memo, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";
import { useTranslation } from "@/app/i18n";

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

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: "top" | "left" | "none";
}

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

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  className?: string;
}

const noSpinners =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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

export const TagBadge = memo(function TagBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] sm:text-xs leading-[16px] px-1.5 py-0.5 rounded-[4px] border border-border bg-bg-secondary text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
});

const dotSizeClass = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
} as const;

export const Dot = memo(function Dot({
  size = "md",
  color,
  className,
}: {
  size?: keyof typeof dotSizeClass;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", dotSizeClass[size], className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
});

interface ThProps {
  align?: "left" | "right";
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

export const Th = memo(function Th({ align = "left", className, style, children }: ThProps) {
  return (
    <th
      className={cn("px-2.5 py-2.5 font-bold", align === "right" ? "text-right" : "text-left", className)}
      style={style}
    >
      {children}
    </th>
  );
});

interface TdProps {
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

export const Td = memo(function Td({ align = "left", mono, className, style, children }: TdProps) {
  return (
    <td
      className={cn("px-2.5 py-2.5", mono && "font-mono", align === "right" && "text-right", className)}
      style={style}
    >
      {children}
    </td>
  );
});

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-border last:border-b-0", className)} {...props}>
      {children}
    </tr>
  );
}

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
      <Button
        variant="outline"
        size="icon"
        aria-label={t("previousPage")}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </Button>
      <span className="text-sm text-text-secondary tabular-nums" aria-live="polite">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("nextPage")}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
});

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
      <div className="fixed inset-0 bg-black/40 animate-fade-in" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full max-w-md rounded-t-xl sm:rounded-xl border border-border bg-bg-primary shadow-lg animate-sheet-up",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

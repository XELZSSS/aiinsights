import {
  Suspense,
  Component,
  Fragment,
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ErrorInfo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, X } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useSearchAllRankings } from "@/app/domain/search";
import { useSearchStore } from "@/app/stores";
import { Button } from "@/app/components/ui";
import { PageContainer } from "@/app/components/layout";
import type { SearchResult } from "@/shared/types";
import { cn } from "@/shared/utils";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl font-bold text-accent/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-text-primary">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("notFound")}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent-light transition-colors"
        >
          <ArrowLeft size={14} />
          {t("backToHome")}
        </Link>
      </div>
    </PageContainer>
  );
}

const DEBOUNCE_MS = 250;

export function SearchInput() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listboxId = useId();

  const searchTerm = useSearchStore((s) => s.searchTerm);
  const setSearchTerm = useSearchStore((s) => s.setSearchTerm);
  const [inputValue, setInputValue] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue, setSearchTerm]);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const { results, isPending, isError } = useSearchAllRankings(searchTerm);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleResultClick(result: SearchResult) {
    navigate(result.link);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleResultClick(results[activeIndex]!);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-56">
      <label htmlFor={inputId} className="sr-only">
        {t("searchPlaceholder")}
      </label>
      <div className="flex items-center gap-1.5 border border-border rounded-lg bg-bg-card px-3 py-2">
        <Search size={14} className="text-text-secondary" />
        <input
          id={inputId}
          type="text"
          value={inputValue}
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(e.target.value.length >= 2);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (inputValue.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          className="w-full text-sm bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
        />
        {inputValue && (
          <button
            type="button"
            aria-label={t("clear")}
            onClick={() => {
              setInputValue("");
              setIsOpen(false);
              setActiveIndex(-1);
            }}
          >
            <X size={14} className="text-text-secondary" />
          </button>
        )}
      </div>

      {isOpen && inputValue.length >= 2 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 max-h-[28rem] overflow-y-auto overscroll-contain no-scrollbar bg-bg-card border border-border rounded-lg shadow-lg z-50 sm:w-72"
        >
          <div className="p-1">
            {isPending && results.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-3 text-sm text-text-secondary">
                <Loader2 className="size-4 animate-spin" />
                {t("searching")}
              </div>
            ) : isError && results.length === 0 ? (
              <div className="p-3 text-sm text-text-secondary">{t("searchFailed")}</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-text-secondary">{t("noResults")}</div>
            ) : (
              results.map((result, index) => (
                <button
                  key={`${result.source}-${result.id}`}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors",
                    activeIndex === index ? "bg-hover" : "hover:bg-hover",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary truncate">{result.name}</span>
                    {result.score != null && (
                      <span className="text-xs text-text-secondary ml-2 shrink-0 font-mono">
                        {result.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-secondary">{t(result.source as Parameters<typeof t>[0])}</span>
                    {result.provider && <span className="text-xs text-text-secondary">{result.provider}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  errorTitle?: string;
  retryLabel?: string;
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = "ErrorBoundary";
  state: ErrorBoundaryState = { hasError: false, error: null, resetKey: 0 };
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  private handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };
  render() {
    if (this.state.hasError) {
      const title = this.props.errorTitle ?? "Error";
      const retry = this.props.retryLabel ?? "Retry";
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-2 p-4">
            <p className="text-sm font-bold text-destructive">{title}</p>
            <p className="text-xs text-text-secondary">{this.state.error?.message}</p>
            <Button variant="link" size="sm" onClick={this.handleRetry}>
              {retry}
            </Button>
          </div>
        )
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}

export const Spinner = memo(function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-text-secondary" />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
});

interface SuspenseQueryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseQuery({ children, fallback }: SuspenseQueryProps) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname} errorTitle={t("errorBoundaryTitle")} retryLabel={t("errorBoundaryRetry")}>
      <Suspense fallback={fallback ?? <Spinner />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export { SourcesStatusList } from "./SourcesStatus";

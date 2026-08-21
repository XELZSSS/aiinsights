import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search, X } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useSearchAllRankings } from "@/app/domain/search";
import { useSearchStore } from "@/app/stores";
import type { SearchResult } from "@/shared/types";
import { cn } from "@/shared/utils";

// Wait this long after the last keystroke before running the global search.
const DEBOUNCE_MS = 250;

/** Combobox search box with debounced query, keyboard navigation and click-outside close. */
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

  // Debounce input so the store/query only updates once the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue, setSearchTerm]);

  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const { results, isPending, isError } = useSearchAllRankings(searchTerm);

  // Close the dropdown when clicking anywhere outside the search box.
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
    // Arrow keys cycle through results (wrapping at the ends); Enter selects, Escape closes.
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
          className="absolute top-full left-0 right-0 mt-1.5 max-h-[28rem] overflow-y-auto overscroll-contain no-scrollbar bg-bg-card border border-border rounded-lg shadow-lg z-50 sm:w-72 animate-fade-in"
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
                    "w-full text-left p-3 rounded-md transition-colors active:bg-hover",
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

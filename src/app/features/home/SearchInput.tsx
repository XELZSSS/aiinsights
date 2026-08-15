import { useState, useRef, useEffect, useId, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { useSearchAllRankings } from "../../hooks";
import { useSearchStore } from "../../stores";
import type { SearchResult } from "../../../shared/types";

import { cn } from "../../../shared/utils";

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

  // Keep local input in sync when the store is reset externally (navigation).
  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const results = useSearchAllRankings(searchTerm);

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
    <div ref={containerRef} className="relative w-48 sm:w-56">
      <label htmlFor={inputId} className="sr-only">
        {t("searchPlaceholder")}
      </label>
      <div className="flex items-center gap-1.5 border border-border rounded-lg bg-bg-card px-2.5 py-1.5">
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

      {isOpen && inputValue.length >= 2 && results.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 max-h-80 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-bg-card border border-border rounded-lg shadow-lg z-50 sm:w-64"
        >
          <div className="p-1">
            {results.map((result, index) => (
              <button
                key={`${result.source}-${result.id}`}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={cn("w-full text-left p-2.5 rounded-md transition-colors", activeIndex === index ? "bg-hover" : "hover:bg-hover")}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary truncate">{result.name}</span>
                  {result.score != null && <span className="text-xs text-text-secondary ml-2 shrink-0 font-mono">{result.score.toFixed(1)}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-secondary">{t(result.source as Parameters<typeof t>[0])}</span>
                  {result.provider && <span className="text-xs text-text-secondary">{result.provider}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

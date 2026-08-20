import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLangStore } from "@/app/stores";
import type { Lang, TFunction } from "@/shared/i18n";
import { createT } from "@/shared/i18n";

interface I18nContextValue {
  lang: Lang;
  t: TFunction;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Reads the i18n context; must be used inside an I18nProvider. */
export function useTranslation() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}

// Mirror the active language into <html lang> and the meta description for SEO and a11y.
function syncDocumentMeta(lang: Lang) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    desc.setAttribute("content", createT(lang)("metaDescription"));
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useLangStore((s) => s.lang);
  const setLangState = useLangStore((s) => s.setLang);
  const toggleLang = useLangStore((s) => s.toggleLang);

  useEffect(() => {
    syncDocumentMeta(lang);
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => setLangState(newLang), [setLangState]);

  // Rebuild the translator bound to the current language only when the language changes.
  const t = useCallback(createT(lang), [lang]);

  const contextValue = useMemo<I18nContextValue>(
    () => ({ lang, t, setLang, toggleLang }),
    [lang, t, setLang, toggleLang],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLangStore } from "../stores";
import type { Lang, TFunction } from "../../shared/i18n";
import { createT } from "../../shared/i18n";

export interface I18nContextValue {
  lang: Lang;
  t: TFunction;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslation() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}

function syncDocumentMeta(lang: Lang) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    desc.setAttribute(
      "content",
      lang === "zh"
        ? "AIInsights - AI 模型数据看板，聚合排名、评测、价格、发布动态、提供商分析"
        : "AIInsights - AI Model Dashboard aggregating rankings, benchmarks, pricing, releases, and provider analysis",
    );
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

  const t = useCallback(createT(lang), [lang]);

  const contextValue = useMemo<I18nContextValue>(() => ({ lang, t, setLang, toggleLang }), [lang, t, setLang, toggleLang]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export type { Lang, TranslationKey, TFunction } from "../../shared/i18n";

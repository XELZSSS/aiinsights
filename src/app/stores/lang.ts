import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/shared/i18n";
import { STORAGE_KEYS } from "@/shared/config";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      // Default to Chinese; the persisted choice wins on next load.
      lang: "zh",
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === "en" ? "zh" : "en" })),
    }),
    { name: STORAGE_KEYS.lang },
  ),
);

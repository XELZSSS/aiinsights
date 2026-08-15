import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Lang } from "@/shared/i18n";
import type { ArtificialAnalysisModel, ThemeMode } from "@/shared/types";
import { STORAGE_KEYS } from "@/shared/config";
import { modelId } from "@/shared/utils";

interface SearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchTerm: "",
  setSearchTerm: (term) => set({ searchTerm: term }),
  resetSearch: () => set({ searchTerm: "" }),
}));

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "zh",
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === "en" ? "zh" : "en" })),
    }),
    { name: STORAGE_KEYS.lang },
  ),
);

const MAX_COMPARE = 2;

interface CompareState {
  compareIds: string[];
  toggleCompareModel: (model: ArtificialAnalysisModel) => void;
  removeCompareModel: (model: { id?: string; slug?: string }) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      compareIds: [],
      toggleCompareModel: (model) =>
        set((state) => {
          const key = modelId(model);
          if (!key) return state;
          const exists = state.compareIds.includes(key);
          if (exists) return { compareIds: state.compareIds.filter((id) => id !== key) };
          if (state.compareIds.length >= MAX_COMPARE) return state;
          return { compareIds: [...state.compareIds, key] };
        }),
      removeCompareModel: (model) =>
        set((state) => {
          const key = modelId(model);
          if (!key) return state;
          return { compareIds: state.compareIds.filter((id) => id !== key) };
        }),
      clearCompare: () => set({ compareIds: [] }),
    }),
    {
      name: STORAGE_KEYS.compare,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ compareIds: state.compareIds }),
    },
  ),
);

interface ThemeState {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode:
        typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === "light" ? "dark" : "light",
        })),
    }),
    { name: STORAGE_KEYS.theme },
  ),
);

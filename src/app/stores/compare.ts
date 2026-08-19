import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ArtificialAnalysisModel } from "@/shared/types";
import { STORAGE_KEYS } from "@/shared/config";
import { modelId } from "@/shared/utils";

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

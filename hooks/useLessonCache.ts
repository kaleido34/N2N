import { useCallback } from "react";
import { create } from 'zustand';

interface LessonData {
  quizData: any;
  flashcardsData: any;
  mindmapData: any;
  summary: string[];
  timestamp: number;
}

interface LessonCacheState {
  cache: Record<string, LessonData>;
  setLessonData: (contentId: string, data: Partial<LessonData>) => void;
  getLessonData: (contentId: string) => LessonData | undefined;
  clearLessonData: (contentId: string) => void;
}

export const useLessonCache = create<LessonCacheState>((set: (fn: (state: LessonCacheState) => LessonCacheState) => void, get: () => LessonCacheState) => ({
  cache: {},
  setLessonData: (contentId: string, data: Partial<LessonData>) => set((state: LessonCacheState) => ({
    ...state,
    cache: {
      ...state.cache,
      [contentId]: {
        ...state.cache[contentId],
        ...data,
        timestamp: Date.now(),
      },
    },
  })),
  getLessonData: (contentId: string) => get().cache[contentId],
  clearLessonData: (contentId: string) => set((state: LessonCacheState) => {
    const newCache = { ...state.cache };
    delete newCache[contentId];
    return { ...state, cache: newCache };
  }),
}));

// Custom hook to provide memoized get/set functions for useEffect deps
export function useLessonCacheWithMemo() {
  const store = useLessonCache();
  // Memoize the functions so their reference is stable
  const getLessonData = useCallback(store.getLessonData, []);
  const setLessonData = useCallback(store.setLessonData, []);
  const clearLessonData = useCallback(store.clearLessonData, []);
  return {
    ...store,
    getLessonData,
    setLessonData,
    clearLessonData,
  };
}

// hooks/space-provider.tsx
"use client";

import { create } from "zustand";
import { createContext, useContext, ReactNode, useEffect } from "react";
import { persist } from "zustand/middleware";

// Type definitions
export interface ContentItem {
  id: string;
  youtube_id?: string;
  type?: string;
  createdAt?: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  filename?: string | null;
  fileUrl?: string | null;
}

export interface SpaceItem {
  id: string;
  name: string;
  createdAt?: string;
  contents?: ContentItem[];
}

interface SpacesState {
  spaces: SpaceItem[];
  loading: boolean;
}

interface SpacesActions {
  setSpaces: (spaces: SpaceItem[]) => void;
  addSpace: (space: SpaceItem) => void;
  setLoading: (val: boolean) => void;
  createSpace: (token: string, name: string) => Promise<void>;
  addContentToSpace: (spaceId: string, content: ContentItem) => void;
  resetSpaces: () => void;
  refreshSpaces: (token: string, forceRefresh?: boolean) => Promise<void>;
}

// Create our Zustand store
export const useSpacesStore = create(
  persist<SpacesState & SpacesActions>(
    (set, get) => ({
      spaces: [],
      loading: true,

      setSpaces: (spaces) => {
        set({ spaces, loading: false });
      },

      addSpace: (space) =>
        set((state) => {
          const existing = state.spaces.find(s => s.id === space.id);
          if (existing) return state;
          return { spaces: [...state.spaces, space] };
        }),

      setLoading: (val) => set({ loading: val }),

      // Create a new space via POST /api/spaces
      async createSpace(token, name) {
        const res = await fetch("/api/spaces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to create space");
        const created = await res.json();
        get().addSpace({
          id: created.id,
          name: created.name,
          createdAt: created.createdAt,
          contents: [],
        });
      },

      // Add a new content item to the specified space in local store
      addContentToSpace(spaceId, content) {
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === spaceId
              ? { ...s, contents: [...(s.contents || []), content] }
              : s
          ),
        }));
      },

      // Reset store on logout
      resetSpaces: () => {
        set((state) => {
          if (state.spaces.length === 0 && !state.loading) return state;
          return {
            spaces: [],
            loading: true,
          };
        });
      },

      // Refresh spaces list from the server
      async refreshSpaces(token, forceRefresh = false) {
        const state = get();
        console.log('[DEBUG] refreshSpaces called', { hasToken: !!token, spaces: state.spaces.length, loading: state.loading, forceRefresh });
        // Only skip refresh if we're not forcing and spaces exist
        if (!token || (!forceRefresh && state.spaces.length > 0 && !state.loading)) {
          console.log('[DEBUG] skipping refresh - using cached spaces');
          set({ loading: false });
          return;
        }
        set({ loading: true });
        try {
          console.log('[DEBUG] fetching spaces from API');
          const res = await fetch("/api/spaces", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok) throw new Error("Failed to fetch spaces");
          const { spaces } = await res.json();
          console.log('[DEBUG] got spaces from API:', spaces.length);
          set({ spaces, loading: false });
        } catch (error) {
          console.error("Error refreshing spaces:", error);
          set({ loading: false });
        }
      },
    }),
    {
      name: "spaces-storage", // key for localStorage
    }
  )
);

const SpacesContext = createContext<(SpacesState & SpacesActions) | null>(null);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const store = useSpacesStore();

  // Listen for reset events from AuthProvider instead of direct function calls
  // This breaks the circular dependency
  useEffect(() => {
    const handleResetSpaces = () => {
      console.log("Spaces reset triggered by auth event");
      store.resetSpaces();
    };

    window.addEventListener('auth:resetSpaces', handleResetSpaces);
    return () => {
      window.removeEventListener('auth:resetSpaces', handleResetSpaces);
    };
  }, [store]);

  return (
    <SpacesContext.Provider value={store}>{children}</SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error("useSpaces must be used within a SpacesProvider");
  }
  return context;
}

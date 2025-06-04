// hooks/space-provider.tsx
"use client";

import { create } from "zustand";
import { createContext, useContext, ReactNode, useEffect } from "react";
import { persist } from "zustand/middleware";
import { shouldAllowApiCall, markApiCallCompleted } from "@/lib/api-limiter";

// Type definitions
export interface ContentItem {
  id: string;
  youtube_id?: string;
  type: string;
  createdAt?: string;
  title: string | null;
  thumbnailUrl?: string | null;
  filename?: string | null;
  fileUrl?: string | null;
  // Add other possible fields from different content types
  description?: string | null;
  image_url?: string | null;
  text?: string | null;
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
  _lastRefreshTime: number;
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

// Global API call tracker to prevent multiple components from making simultaneous calls
let isApiCallInProgress = false;
let apiCallTimeout: NodeJS.Timeout | null = null;
let lastSuccessfulCallTime = 0;
const MIN_API_CALL_INTERVAL = 5000; // 5 seconds between API calls

// Create our Zustand store
export const useSpacesStore = create(
  persist<SpacesState & SpacesActions>(
    (set, get) => ({
      spaces: [],
      loading: true,
      _lastRefreshTime: 0,

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
        // Clear the localStorage cache for spaces
        try {
          localStorage.removeItem('spaces-storage');
        } catch (error) {
          console.error('Error clearing spaces cache:', error);
        }
        
        set((state) => {
          if (state.spaces.length === 0 && !state.loading) return state;
          return {
            spaces: [],
            loading: true,
          };
        });
      },

      // Track last refresh time to prevent excessive API calls
      
      // Refresh spaces list from the server
      async refreshSpaces(token, forceRefresh = false) {
        const endpoint = "/api/spaces";
        const now = Date.now();
        
        // Enhanced debouncing to prevent repeated API calls
        if (!forceRefresh) {
          // Check if we've made a successful call recently
          if (now - lastSuccessfulCallTime < MIN_API_CALL_INTERVAL) {
            console.log('[DEBUG] skipping refresh - too soon after last successful call');
            set({ loading: false });
            return;
          }
          
          // Use the API limiter as a secondary check
          if (!shouldAllowApiCall(endpoint, MIN_API_CALL_INTERVAL)) {
            console.log('[DEBUG] skipping refresh - rate limited');
            set({ loading: false });
            return;
          }
        }
        
        // Prevent multiple simultaneous API calls
        if (isApiCallInProgress) {
          console.log('[DEBUG] skipping refresh - another call already in progress');
          return;
        }
        
        const state = get();
        console.log('[DEBUG] refreshSpaces called', { hasToken: !!token, spaces: state.spaces.length, loading: state.loading, forceRefresh });
        
        // Skip if no token
        if (!token) {
          console.log('[DEBUG] skipping refresh - no token');
          set({ loading: false });
          return;
        }
        
        // Set flags to prevent duplicate calls
        isApiCallInProgress = true;
        
        // Update last refresh time
        set({ _lastRefreshTime: now });
        set({ loading: true });
        
        try {
          console.log('[DEBUG] fetching spaces from API');
          try {
            const res = await fetch(endpoint, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              // Add cache control to prevent browser caching
              cache: 'no-store',
            });
            
            // Handle non-OK responses more gracefully
            if (!res.ok) {
              console.error(`[ERROR] Failed to fetch spaces: ${res.status} ${res.statusText}`);
              // Don't throw, just set loading to false and return
              set({ loading: false });
              return;
            }
            
            const data = await res.json();
            
            // Check if the response has the expected structure
            if (!data || !data.spaces || !Array.isArray(data.spaces)) {
              console.error('[ERROR] Unexpected response format from /api/spaces:', data);
              set({ loading: false });
              return;
            }
            
            console.log('[DEBUG] got spaces from API:', data.spaces.length);
            
            // Transform the spaces data to ensure consistent structure
            const transformedSpaces = data.spaces.map((space: any) => ({
              ...space,
              contents: space.contents?.map((content: any) => ({
                ...content,
                // Ensure title is set from either title or filename
                title: content.title || content.filename || 'Untitled',
                // Ensure type is in the correct format
                type: content.type || 'UNKNOWN'
              })) || []
            }));
            
            set({ spaces: transformedSpaces, loading: false });
            
            // Update the last successful call time
            lastSuccessfulCallTime = Date.now();
          } catch (fetchError) {
            console.error('[ERROR] Exception while fetching spaces:', fetchError);
            set({ loading: false });
          } finally {
            // Clear the in-progress flag
            isApiCallInProgress = false;
            markApiCallCompleted(endpoint);
          }
        } catch (error) {
          console.error("Error refreshing spaces:", error);
          set({ loading: false });
          isApiCallInProgress = false;
          markApiCallCompleted(endpoint);
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

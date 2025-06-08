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
  initialized: boolean;
  _lastRefreshTime: number;
}

interface SpacesActions {
  setSpaces: (spaces: SpaceItem[]) => void;
  addSpace: (space: SpaceItem) => void;
  setLoading: (val: boolean) => void;
  setInitialized: (val: boolean) => void;
  createSpace: (token: string, name: string) => Promise<void>;
  addContentToSpace: (spaceId: string, content: ContentItem) => void;
  resetSpaces: () => void;
  refreshSpaces: (token: string, forceRefresh?: boolean) => Promise<void>;
}

// Global API call tracker to prevent multiple components from making simultaneous calls
let isApiCallInProgress = false;
let lastSuccessfulCallTime = 0;
const MIN_API_CALL_INTERVAL = 2000; // Reduced to 2 seconds for better UX

// Create our Zustand store
export const useSpacesStore = create(
  persist<SpacesState & SpacesActions>(
    (set, get) => ({
      spaces: [],
      loading: false, // Changed default to false to prevent initial flash
      initialized: false,
      _lastRefreshTime: 0,

      setSpaces: (spaces) => {
        set({ spaces, loading: false, initialized: true });
      },

      addSpace: (space) =>
        set((state) => {
          const existing = state.spaces.find(s => s.id === space.id);
          if (existing) return state;
          return { spaces: [...state.spaces, space] };
        }),

      setLoading: (val) => {
        const state = get();
        // Only update if the value is actually changing
        if (state.loading !== val) {
          set({ loading: val });
        }
      },

      setInitialized: (val) => {
        const state = get();
        if (state.initialized !== val) {
          set({ initialized: val });
        }
      },

      // Create a new workspace via POST /api/workspaces
      async createSpace(token, name) {
        const res = await fetch("/api/workspaces", {
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
        
        set({
          spaces: [],
          loading: false,
          initialized: false,
        });
      },

      // Refresh workspaces list from the server with better state management
      async refreshSpaces(token: string, forceRefresh = false) {
        const endpoint = "/api/workspaces";
        const now = Date.now();
        const state = get();
        
        // Enhanced debouncing to prevent repeated API calls
        if (!forceRefresh) {
          // Check if we've made a successful call recently
          if (now - lastSuccessfulCallTime < MIN_API_CALL_INTERVAL) {
            console.log('[DEBUG] skipping refresh - too soon after last successful call');
            return;
          }
          
          // Use the API limiter as a secondary check
          if (!shouldAllowApiCall(endpoint, MIN_API_CALL_INTERVAL)) {
            console.log('[DEBUG] skipping refresh - rate limited');
            return;
          }
        }
        
        // Prevent multiple simultaneous API calls
        if (isApiCallInProgress) {
          console.log('[DEBUG] skipping refresh - another call already in progress');
          return;
        }
        
        console.log('[DEBUG] refreshSpaces called', { 
          hasToken: !!token, 
          spaces: state.spaces.length, 
          loading: state.loading, 
          initialized: state.initialized,
          forceRefresh 
        });
        
        // Skip if no token
        if (!token) {
          console.log('[DEBUG] skipping refresh - no token');
          get().setInitialized(true);
          return;
        }
        
        // Set flags to prevent duplicate calls
        isApiCallInProgress = true;
        
        // Update last refresh time
        set({ _lastRefreshTime: now });
        
        // Only set loading if we're not initialized or force refresh
        if (!state.initialized || forceRefresh) {
          get().setLoading(true);
        }
        
        try {
          console.log('[DEBUG] fetching spaces from API');
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
            get().setLoading(false);
            get().setInitialized(true);
            return;
          }
          
          const data = await res.json();
          
          // Check if the response has the expected structure
          if (!data || !data.workspaces || !Array.isArray(data.workspaces)) {
            console.error('[ERROR] Unexpected response format from /api/workspaces:', data);
            get().setLoading(false);
            get().setInitialized(true);
            return;
          }
          
          console.log('[DEBUG] got workspaces from API:', data.workspaces.length);
          
          // Transform workspaces to match expected format
          const transformedSpaces: SpaceItem[] = data.workspaces.map((ws: any) => ({
            id: ws.space_id || ws.id,
            name: ws.space_name || ws.name || "Untitled Space",
            createdAt: ws.created_at || new Date().toISOString(),
            contents: (ws.contents || []).map((content: any) => ({
              id: content.content_id || content.id,
              youtube_id: content.youtube_id,
              type: content.content_type || content.type || "UNKNOWN",
              title: content.title || content.youtube_title || content.filename || "Untitled",
              thumbnailUrl: content.thumbnail_url || content.thumbnailUrl,
              filename: content.filename,
              fileUrl: content.file_url || content.fileUrl,
              description: content.description,
              image_url: content.image_url,
              text: content.text,
              createdAt: content.created_at || content.createdAt,
            })),
          }));
          
          console.log('[DEBUG] setting transformed spaces:', transformedSpaces.length);
          
          // Use setSpaces which also sets loading=false and initialized=true
          get().setSpaces(transformedSpaces);
          
          // Mark successful API call
          lastSuccessfulCallTime = now;
          markApiCallCompleted(endpoint);
          
        } catch (error) {
          console.error('[ERROR] Failed to fetch spaces:', error);
          get().setLoading(false);
          get().setInitialized(true);
        } finally {
          // Always reset the API call flag after a delay
          setTimeout(() => {
            isApiCallInProgress = false;
          }, 1000);
        }
      },
    }),
    {
      name: "spaces-storage",
      // Add version for cache invalidation if needed
      version: 1,
    }
  )
);

// Provider component to handle space reset events
export function SpacesProvider({ children }: { children: ReactNode }) {
  const resetSpaces = useSpacesStore((state) => state.resetSpaces);

  useEffect(() => {
    const handleResetSpaces = () => {
      console.log('[DEBUG] SpacesProvider received reset event');
      resetSpaces();
    };

    // Listen for reset events from AuthProvider
    window.addEventListener('auth:resetSpaces', handleResetSpaces);
    
    return () => {
      window.removeEventListener('auth:resetSpaces', handleResetSpaces);
    };
  }, [resetSpaces]);

  return <>{children}</>;
}

// Custom hook to access spaces store
export function useSpaces() {
  return useSpacesStore();
}

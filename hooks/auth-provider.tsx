"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createContext, useContext, ReactNode, useEffect } from "react";

// IMPORTANT: Remove direct import of useSpacesStore to break circular dependency
// import { useSpacesStore } from "@/hooks/space-provider";

// User and Space Interfaces
interface Space {
  id: string;
  name: string;
}

interface User {
  user_id: string;
  email: string;
  name: string;
  username: string; // Add this line
  spaces?: Space[];
  first_name?: string;
  last_name?: string;
  token?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  shouldResetSpaces: boolean; // Flag to trigger space reset without direct dependency
}

interface AuthActions {
  login: (userData: User) => void;
  logout: () => void;
  updateUserSpaces: (spaces: Space[]) => void;
  updateUserData: (updatedData: Partial<User>) => void;
  clearResetSpacesFlag: () => void;
}

// Zustand Store
export const useAuthStore = create(
  persist<AuthState & AuthActions>(
    (set) => ({
      user: null,
      isAuthenticated: false,
      shouldResetSpaces: false,

      // Login function - fixed to avoid direct dependency
      login: (userData: User) => {
        set((state) => {
          if (state.isAuthenticated && state.user?.user_id === userData.user_id) {
            return state;
          }

          // Set flag instead of directly calling another store
          return {
            user: userData,
            isAuthenticated: true,
            shouldResetSpaces: true
          };
        });
      },

      // Logout function - fixed to avoid direct dependency
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          shouldResetSpaces: true
        });
      },

      // Update spaces for the user
      updateUserSpaces: (spaces: Space[]) =>
        set((state) => ({
          user: state.user ? { ...state.user, spaces } : null,
        })),

      // Update partial user data
      updateUserData: (updatedData: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedData } : null,
        })),

      // Clear the reset spaces flag
      clearResetSpacesFlag: () =>
        set({ shouldResetSpaces: false }),
    }),
    {
      name: "auth-storage", // LocalStorage key
    }
  )
);

// Auth Context to wrap Zustand store for React Context
const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();

  // Handle the reset spaces flag in the provider component
  useEffect(() => {
    if (authStore.shouldResetSpaces) {
      // Instead of directly calling useSpacesStore, we'll use a more indirect approach
      // This requires the SpacesProvider to listen for this event

      // Use an event to communicate between stores without direct imports
      const event = new CustomEvent('auth:resetSpaces', { detail: { triggered: true } });
      window.dispatchEvent(event);
      // Clear the flag
      authStore.clearResetSpacesFlag();
    }
  }, [authStore.shouldResetSpaces, authStore.clearResetSpacesFlag]);

  return (
    <AuthContext.Provider value={authStore}>{children}</AuthContext.Provider>
  );
}

// Custom Hook for Accessing Auth State and Actions
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

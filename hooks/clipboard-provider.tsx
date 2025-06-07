"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface CopiedLesson {
  id: string;
  type: string;
  title?: string;
  thumbnailUrl?: string;
  filename?: string;
  fileUrl?: string;
  youtube_id?: string;
  originalWorkspaceId: string;
}

interface ClipboardState {
  copiedLessons: CopiedLesson[];
  hasCopiedLessons: boolean;
}

interface ClipboardActions {
  copyLesson: (lesson: CopiedLesson) => void;
  clearClipboard: () => void;
  getCopiedLessons: () => CopiedLesson[];
}

type ClipboardContextType = ClipboardState & ClipboardActions;

const ClipboardContext = createContext<ClipboardContextType | null>(null);

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [copiedLessons, setCopiedLessons] = useState<CopiedLesson[]>([]);

  const copyLesson = (lesson: CopiedLesson) => {
    // Check if lesson is already in clipboard to avoid duplicates
    const isAlreadyCopied = copiedLessons.some(copied => copied.id === lesson.id);
    if (!isAlreadyCopied) {
      setCopiedLessons(prev => [...prev, lesson]);
    }
  };

  const clearClipboard = () => {
    setCopiedLessons([]);
  };

  const getCopiedLessons = () => {
    return copiedLessons;
  };

  const hasCopiedLessons = copiedLessons.length > 0;

  return (
    <ClipboardContext.Provider
      value={{
        copiedLessons,
        hasCopiedLessons,
        copyLesson,
        clearClipboard,
        getCopiedLessons,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (!context) {
    throw new Error("useClipboard must be used within a ClipboardProvider");
  }
  return context;
} 
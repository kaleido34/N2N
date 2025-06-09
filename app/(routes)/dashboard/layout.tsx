"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { Link2, ArrowRight, Loader2, Paperclip, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";

/**
 * Optimized dashboard layout with stabilized loading to prevent flashing
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Define all hooks at the top level before any conditional returns
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { spaces, loading, initialized, setSpaces, addContentToSpace, refreshSpaces } = useSpaces();
  const [minimized, setMinimized] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  const router = useRouter();

  // Memoize all handlers with useCallback to prevent unnecessary re-renders
  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const matched = pathname.match(/spaces\/([^/]+)/);
    const space_id = matched ? matched[1] : undefined;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.user_id || "");
      if (space_id) formData.append("spaceId", space_id);

      const res = await fetch("/api/contents/upload/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload PDF");
      }

      const { contentId, spaceId } = await res.json();
      addContentToSpace(spaceId, {
        id: contentId,
        type: "DOCUMENT_CONTENT",
        title: file.name,
      });
      router.replace(`/dashboard/spaces/${spaceId}`);
    } catch (err) {
      console.error("Error uploading PDF:", err);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [pathname, user, addContentToSpace, router]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const matched = pathname.match(/spaces\/([^/]+)/);
    const space_id = matched ? matched[1] : undefined;

    try {
      setIsLoading(true);
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
          user: JSON.stringify({ user_id: user?.user_id }),
        },
        body: JSON.stringify({
          youtube_url: inputValue.trim(),
          space_id,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to create content");
      }

      const json = await res.json();
      const { data } = json;

      addContentToSpace(data.space_id, {
        id: data.content_id,
        youtube_id: data.youtube_id,
        type: data.type,
        title: data.title,
        thumbnailUrl: data.thumbnail_url,
      });

      router.replace(`/dashboard/workspaces/${data.space_id}`);
    } catch (err) {
      console.error("Error creating content:", err);
    } finally {
      setIsLoading(false);
      setInputValue("");
    }
  }, [inputValue, pathname, user, addContentToSpace, router]);

  // Single initialization effect to handle auth and spaces
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initialize = async () => {
      console.log('[DEBUG] Dashboard initializing', { 
        isAuthenticated, 
        hasToken: !!user?.token,
        initialized 
      });

      // Wait for auth state to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isAuthenticated || !user?.token) {
        router.replace("/signin");
        return;
      }

      // Only fetch spaces if not already initialized
      if (!initialized && !loading) {
        try {
          await refreshSpaces(user.token, true);
        } catch (error) {
          console.error('Failed to initialize spaces:', error);
        }
      }

      // Mark as ready after a short delay to prevent flash
      setTimeout(() => {
        setIsReady(true);
      }, 150);
    };

    initialize();
  }, []); // Only run once

  // Redirect effect (separate from initialization)
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router, isReady]);

  // Show loading screen with stabilized state
  if (!isReady || !isAuthenticated || (!initialized && loading)) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-[#18132A]/80 transition-colors duration-300">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-bounce">
            <img src="/logo.png" alt="Noise2Nectar Logo" width={80} height={80} className="rounded-2xl shadow-xl" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-[#7B5EA7] dark:text-[#C7AFFF] tracking-tight">Noise2Nectar</span>
            <span className="sr-only">Loading...</span>
          </div>
          <div className="mt-4">
            <span className="inline-block h-6 w-6 rounded-full border-4 border-[#7B5EA7] border-t-transparent animate-spin dark:border-[#C7AFFF] dark:border-t-transparent"></span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <DashboardSidebar minimized={minimized} setMinimized={setMinimized} />
      <main className="flex-1 overflow-x-hidden">
        <div className="w-full max-w-full">
        {children}
        </div>
      </main>
    </div>
  );
}


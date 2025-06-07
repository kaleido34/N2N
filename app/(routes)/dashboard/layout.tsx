"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { Link2, ArrowRight, Loader2, Paperclip, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";

/**
 * This is a restored version of the dashboard layout with fixes for the render loop issues
 */
export default function RestoredDashboardLayout({
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
  const { setSpaces, setLoading, loading, addContentToSpace } = useSpaces();
  const [minimized, setMinimized] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.token) {
      router.replace("/signin");
    }
  }, [isAuthenticated, user?.token, router]);

  // Load spaces once
  useEffect(() => {
    if (!user?.token || !isAuthenticated || initialLoadDone || !loading) return;
    
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadInitialSpaces() {
      try {
        const res = await fetch("/api/workspaces", {
          headers: { Authorization: `Bearer ${user?.token ?? ""}` },
          signal
        });
        
        if (signal.aborted) return;
        if (!res.ok) throw new Error("Failed to fetch workspaces");
        
        const data = await res.json();
        if (!signal.aborted) {
          setSpaces(data.workspaces);
          setInitialLoadDone(true);
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error(err);
        }
      }
    }

    loadInitialSpaces();
    return () => controller.abort();
  }, [user?.token, isAuthenticated, loading, initialLoadDone, setSpaces]);

  // Loading screen
  if (!isAuthenticated || loading) {
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <DashboardSidebar minimized={minimized} setMinimized={setMinimized} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}


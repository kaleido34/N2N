"use client";

import { useParams, useRouter } from "next/navigation";
import { Video, FileText, FileAudio, FileImage, File, Headphones } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useGlobalLoading } from "@/components/LayoutClient";
import React from "react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";
import { shouldAllowApiCall, markApiCallCompleted } from "@/lib/api-limiter";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: string;
  type: string;
  title?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  filename?: string;
  fileUrl?: string;
  youtube_id?: string;
}

interface SpaceData {
  id: string;
  name: string;
  createdAt?: string;
  contents: ContentItem[];
}

/** Shape of each content item in the space. */

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { spaces, loading, refreshSpaces } = useSpaces();
  const { isAuthenticated, user } = useAuth();
  const { setShow } = useGlobalLoading();

  const [localContents, setLocalContents] = React.useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const spaceId = params.id as string;

  // Use a ref to track if a fetch is in progress
  const isFetchingRef = React.useRef(false);
  // Use a ref to track if we've already fetched data
  const hasFetchedRef = React.useRef(false);

  // Track route changes to properly reset state
  const [routeVersion, setRouteVersion] = React.useState<number>(0);
  
  // Track URL query params to force refresh on cache issues
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const forcedRefresh = searchParams?.get('t') || null;

  const fetchWorkspaceContents = React.useCallback(async () => {
    if (isFetchingRef.current || !user?.token) return;
    
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      // Add cache busting to prevent stale data
      const timestamp = Date.now();
      const endpoint = `/api/workspaces/${spaceId}?_nocache=${timestamp}`;
      console.log("[DEBUG] Fetching workspace contents from:", endpoint);
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        next: { revalidate: 0 },
        cache: 'no-store'
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch space contents");
      }
      
      const data = await res.json();
      console.log("[DEBUG] API response data:", data);
      
      if (!data || !data.workspace) {
        console.error("[ERROR] Invalid API response format:", data);
        throw new Error("Invalid API response format");
      }
      
      const space = data.workspace;
      
      if (space) {
        console.log("[DEBUG] Found workspace with", space.contents?.length || 0, "content items");
        // Always ensure contents is a valid array
        const safeContents = Array.isArray(space.contents) ? space.contents : [];
        
        // Important: Log content items for debugging
        if (safeContents.length > 0) {
          console.log("[DEBUG] Content items found:", safeContents.map((c: ContentItem) => ({ id: c.id, type: c.type, title: c.title })));
        } else {
          console.log("[DEBUG] No content items found in the workspace");
        }
        
        setLocalContents(safeContents);
        // Mark as fetched
        hasFetchedRef.current = true;
      } else {
        console.warn("[DEBUG] No workspace data found in API response");
        setLocalContents([]);
      }
    } catch (error) {
      console.error("[ERROR] Error fetching workspace contents:", error);
      toast.error("Failed to load workspace contents");
      setLocalContents([]);
    } finally {
      setIsLoading(false);
      setShow(false);
      isFetchingRef.current = false;
    }
  }, [spaceId, user?.token, setShow]);
  
  // Check for refresh parameters and stored tokens
  React.useEffect(() => {
    // Check if we have the fresh parameter in the URL
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const isFreshRequest = url.includes('fresh=true');
    
    if (isFreshRequest) {
      console.log('[DEBUG] Detected fresh=true parameter, will force refresh');
    }
    
    // If there's a token in localStorage but user isn't authenticated,
    // this could be due to navigation issues - try to use the stored token
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (storedToken && !isAuthenticated) {
      console.log('[DEBUG] Found stored token, attempting to use it');
      // We could trigger authentication here if needed
    }
  }, [isAuthenticated]);
  
  // Effect to fetch space contents on mount or param change
  React.useEffect(() => {
    let mounted = true;
    
    // Function to initialize component and fetch data
    const initComponent = async () => {
      if (!mounted || !isAuthenticated || loading) {
        if (!isAuthenticated) {
          console.log('[DEBUG] Not authenticated');
        }
        return;
      }
      
      // Always reset fetch state for consistent behavior
      hasFetchedRef.current = false;
      
      // Show loading indicator
      setShow(true);
      
      // Check if this is a forced refresh from URL parameter
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const isForceRefresh = url.includes('t=');
      
      if (isForceRefresh) {
        console.log('[DEBUG] Force refresh detected from URL parameter');
        // We'll do multiple fetches for reliability
        fetchWorkspaceContents();
        
        // Try again after a short delay in case the first fetch was too early
        const timer = setTimeout(() => {
          if (mounted && !hasFetchedRef.current) {
            console.log('[DEBUG] Retry fetch after delay');
            fetchWorkspaceContents();
          }
        }, 500);
        
        return () => clearTimeout(timer);
      } else {
        // Regular navigation - just fetch once
        fetchWorkspaceContents();
      }
    };
    
    initComponent();
    
    // Cleanup function
    return () => {
      mounted = false;
      setShow(false);
    };
  }, [isAuthenticated, loading, spaceId, fetchWorkspaceContents, setShow]);

  // Show loading state if not authenticated or still loading spaces
  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  // Find the specific workspace by ID from the global store
  const workspaceData = spaces.find((space) => space.id === spaceId) || null;

  if (!workspaceData) {
    return <p>Workspace not found</p>;
  }

  // Keep this for any future UI differences, but delete will work everywhere
  const isPersonalWorkspace = workspaceData.name.toLowerCase().includes("personal") && workspaceData.name.toLowerCase().includes("workspace");

  // Function to delete content from the workspace
  const handleDeleteContent = async (contentId: string) => {
    try {
      const res = await fetch(`/api/contents/${contentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      
      // Update local state immediately for better UX
      setLocalContents((prev) => prev.filter((item) => item.id !== contentId));
      
      // Refresh spaces to update the sidebar
      if (user?.token && refreshSpaces) {
        await refreshSpaces(user.token, true);
      }
      
      toast.success("Lesson deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete lesson");
      
      // If there's an error, refresh spaces to ensure consistency
      if (user?.token && refreshSpaces) {
        await refreshSpaces(user.token, true);
      }
    }
  };

  // Function to delete the entire workspace
  const handleDeleteWorkspace = async () => {
    if (!user?.token || !spaceId) return;
    
    // Don't allow deleting Personal Workspace
    if (isPersonalWorkspace) {
      toast.error("You cannot delete your Personal Workspace");
      return;
    }
    
    // Confirm deletion
    if (!confirm("Are you sure you want to delete this workspace and all its contents?")) {
      return;
    }
    
    try {
      console.log("[DEBUG] Deleting workspace:", spaceId);
      
      // Delete the workspace
      const res = await fetch(`/api/workspaces/${spaceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to delete workspace");
      
      toast.success("Workspace deleted successfully!");
      
      // Refresh spaces to update the sidebar
      if (refreshSpaces && user?.token) {
        await refreshSpaces(user.token, true);
      }
      
      // Navigate back to workspaces page
      router.push("/dashboard/workspaces");
      router.refresh();
    } catch (error) {
      console.error("[ERROR] Failed to delete workspace:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace");
    }
  };

  return (
    <div className="min-h-full bg-[#FAF7F8] dark:bg-gray-900">
      <main className="container py-8 px-4 md:px-8">
        <div className="flex justify-between items-start w-full mb-8">
          <h1 className="text-4xl font-bold tracking-tight pt-4 text-[#5B4B8A] dark:text-white">
            {isPersonalWorkspace ? "Personal Workspace" : workspaceData.name}
          </h1>
          <BackButton onClick={() => router.push("/dashboard/workspaces")} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {localContents.map((item) => (
            <div key={item.id} className="relative group">
              <Link
                href={`/content/${item.id}`}
                className="group relative rounded-md border overflow-hidden hover:border-primary transition-colors block p-2 bg-card dark:bg-gray-800"
              >
                {item.type === "YOUTUBE_CONTENT" ? (
                  <div className="aspect-video bg-muted relative rounded-md overflow-hidden">
                    <Image
                      src={item.thumbnailUrl || "/placeholder.svg"}
                      alt={item.title || "No title"}
                      width={640}
                      height={360}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    {/* Small rectangular YT play icon overlay with white triangle */}
                    <div className="absolute top-2 left-2 z-10 flex items-center justify-center rounded-lg border-2 border-white bg-[#FF4B4B] w-9 h-7 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center rounded-md bg-transparent">
                    <div className="flex items-center justify-center w-32 h-32 rounded-full shadow-lg" style={{ backgroundColor:
                      item.type === 'PDF' || item.type === 'PDF_CONTENT' ? '#4285F4' :
                      item.type === 'IMAGE' || item.type === 'IMAGE_CONTENT' ? '#1fd655' :
                      item.type === 'AUDIO' || item.type === 'AUDIO_CONTENT' ? '#A259FF' :
                      '#2D1B69' }}>
                      {item.type === 'PDF' || item.type === 'PDF_CONTENT' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-white">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <line x1="12" y1="9" x2="8" y2="9"/>
                        </svg>
                      ) : item.type === 'IMAGE' || item.type === 'IMAGE_CONTENT' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-white">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                          <circle cx="9" cy="9" r="2"/>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                      ) : item.type === 'AUDIO' || item.type === 'AUDIO_CONTENT' ? (
                        <Headphones className="w-20 h-20 text-white" />
                      ) : (
                        <File className="w-20 h-20 text-white" />
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors text-base mb-0.5 truncate" title={item.title || item.filename || "Untitled"}>
                    {item.title || item.filename || "Untitled"}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "Added recently"}
                  </p>
                </div>
              </Link>
              {/* 3-dot menu for delete */}
              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "p-1 rounded-full focus:outline-none transition-colors",
                        item.type === "YOUTUBE_CONTENT"
                          ? "hover:bg-orange-500/50" // Orange hover for white icon
                          : "hover:bg-black/20 dark:hover:bg-white/20"
                      )}
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical
                        className={cn(
                          "h-5 w-5",
                          item.type === "YOUTUBE_CONTENT"
                            ? "text-white"
                            : "text-black dark:text-white"
                        )}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-red-500 cursor-pointer" 
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDeleteContent(item.id);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
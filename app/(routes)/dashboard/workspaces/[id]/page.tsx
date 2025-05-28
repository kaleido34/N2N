"use client";

import { useParams, useRouter } from "next/navigation";
import { Video, FileText } from "lucide-react";
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
  const spaceId = params.id as string;

  React.useEffect(() => {
    let mounted = true;

    const fetchSpaceContents = async () => {
      try {
        const res = await fetch(`/api/spaces?space_id=${spaceId}`, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch space contents");
        const { spaces } = await res.json();
        const space = spaces[0];
        if (mounted && space) {
          setLocalContents(space.contents as ContentItem[]);
        }
      } catch (error) {
        console.error("Error fetching space contents:", error);
        toast.error("Failed to load space contents");
      }
    };

    if (mounted) {
      if (!isAuthenticated || loading) {
        setShow(true);
      } else {
        setShow(false);
        fetchSpaceContents();
      }
    }

    // Hide overlay on unmount
    return () => {
      mounted = false;
      setShow(false);
    };
  }, [isAuthenticated, loading, setShow, user?.token, spaceId]);

  // Show loading state if not authenticated or still loading spaces
  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  // Find the specific space by ID from the global store
  const spaceData = spaces.find((space) => space.id === spaceId) || null;

  if (!spaceData) {
    return <p>Space not found</p>;
  }

  // Keep this for any future UI differences, but delete will work everywhere
  const isPersonalWorkspace = spaceData.name === "Personal Workspace";

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

  return (
    <div className="min-h-full">
      <main className="container py-8 px-4 md:px-8">
        <div className="flex justify-between items-start w-full mb-8">
          <h1 className="text-4xl font-bold tracking-tight pt-4 text-[#5B4B8A] dark:text-white">
            {isPersonalWorkspace ? "Personal Workspace" : spaceData.name}
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
                    <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center rounded-md">
                    <FileText className="h-8 w-8 text-white dark:text-white" />
                  </div>
                )}
                <div className="p-2">
                  <h3 className="font-semibold text-white dark:text-white group-hover:text-primary transition-colors text-base mb-0.5 truncate" title={item.title || "Untitled"}>
                    {item.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-white dark:text-gray-200 mt-0">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </Link>
              {/* 3-dot menu for delete */}
              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-1 rounded-full hover:bg-[#E58C5A]/80 dark:hover:bg-[#E58C5A]/90 focus:outline-none"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-5 w-5 text-white" />
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
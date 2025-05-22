"use client";

import { useParams } from "next/navigation";
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

/** Shape of each content item in the space. */

export default function SpacePage() {
  const { id } = useParams();
  const { spaces, loading } = useSpaces();
  const { isAuthenticated } = useAuth();
  const { setShow } = useGlobalLoading();

  React.useEffect(() => {
    if (!isAuthenticated || loading) {
      setShow(true);
    } else {
      setShow(false);
    }
    // Hide overlay on unmount
    return () => setShow(false);
  }, [isAuthenticated, loading, setShow]);

  // Show loading state if not authenticated or still loading spaces
  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  // Find the specific space by ID from the global store
  const spaceData = spaces.find((space) => space.id === id) || null;

  if (!spaceData) {
    return <p>Space not found</p>;
  }

  const isDefault = spaceData.id === "default" || spaceData.name.toLowerCase().includes("default");

  const handleDeleteContent = async (contentId: string) => {
    // TODO: Replace with your actual API endpoint for deleting content
    try {
      await fetch(`/api/contents/${contentId}`, { method: "DELETE" });
      window.location.reload(); // Or use router.refresh() if available
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-full dark:bg-gray-900">
      <main className="container py-6">
        <div className="flex flex-col space-y-8">
          {/* Top bar with heading and back button */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold tracking-tight" style={{color: '#5B4B8A'}}>
              {isDefault ? "Personal Workspace" : spaceData.name}
            </h1>
            <Button
              variant="ghost"
              className="text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Contents Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spaceData.contents?.map((item) => (
              <div key={item.id} className="relative group">
                <Link
                  href={`/content/${item.id}`}
                  className="group relative rounded-md border overflow-hidden hover:border-primary transition-colors block p-2"
                >
                  {/* Render content type */}
                  {item.type === "YOUTUBE_CONTENT" ? (
                    <div className="aspect-video bg-muted relative rounded-md">
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
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Content Details */}
                  <div className="p-2">
                    <h3 className="font-semibold tracking-tight group-hover:text-primary transition-colors text-base mb-0.5">
                      {item.title || "Untitled"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0">
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
                      <button className="p-1 rounded-full hover:bg-[#E58C5A]/80 dark:hover:bg-[#E58C5A]/90 focus:outline-none">
                        <MoreVertical className="h-5 w-5 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteContent(item.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

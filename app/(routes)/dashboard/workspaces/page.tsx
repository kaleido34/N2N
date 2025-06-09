"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { useClipboard } from "@/hooks/clipboard-provider";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { Briefcase, MoreVertical, PlusCircle, Trash2, Clipboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuIconButton,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function SpacesPage() {
  const { isAuthenticated, user } = useAuth();
  const { spaces, loading, addSpace, refreshSpaces } = useSpaces();
  const { copiedLessons, hasCopiedLessons, clearClipboard } = useClipboard();
  const router = useRouter();

  // Stabilized loading state to prevent flashing
  const [isStableLoading, setIsStableLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const initRef = useRef(false);

  console.log('[DEBUG] SpacesPage render', { 
    isAuthenticated, 
    hasToken: !!user?.token,
    loading,
    spacesCount: spaces.length,
    isStableLoading,
    hasInitialized
  });

  // Redirect if not authenticated - but don't block render
  useEffect(() => {
    if (hasInitialized && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router, hasInitialized]);

  // Single initialization effect with stabilized loading
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializePage = async () => {
      console.log('[DEBUG] SpacesPage initializing', { 
        isAuthenticated, 
        hasToken: !!user?.token 
      });

      // Wait a small moment to ensure auth state is stable
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isAuthenticated || !user?.token) {
        setHasInitialized(true);
        setIsStableLoading(false);
        return;
      }

      try {
        // Only fetch if we don't have spaces data
        if (!spaces || spaces.length === 0) {
          await refreshSpaces(user.token, true);
        }
      } catch (error) {
        console.error('Error initializing spaces:', error);
        toast.error('Failed to load workspaces');
      } finally {
        setHasInitialized(true);
        // Add a slight delay to prevent flash
        setTimeout(() => {
          setIsStableLoading(false);
        }, 200);
      }
    };

    initializePage();
  }, []); // Only run once

  // Dashboard layout handles authentication and loading, so we don't need redundant checks here

  // Show empty state if there are no spaces
  if (!spaces || spaces.length === 0) {
    return (
      <div className="min-h-full dark:bg-gray-900">
        <main className="container py-6 px-4 md:px-8">
          <div className="flex justify-between items-start w-full mb-8">
            <h2 className="text-4xl font-bold tracking-tight pt-4" style={{color: '#5B4B8A'}}>
              My Workspace
            </h2>
            <BackButton onClick={() => router.push("/dashboard")} />
          </div>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold mb-8 text-center text-[#5B4B8A]">
                No workspaces yet
              </h2>
              <p className="mb-16 text-muted-foreground text-left">
                You haven't created any workspaces yet. Create a new workspace to keep your videos, documents, and other content neatly organized!
              </p>
              <div className="flex justify-center">
                <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
                  <Button className="bg-[#5B4B8A] hover:bg-[#4a3a6a] text-white">
                    Create Workspace
                  </Button>
                </CreateSpaceDialog>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  async function handleCreateSpace(name: string) {
    if (!user?.token) {
      toast.error("You must be logged in to create a workspace");
      return;
    }

    try {
      console.log("[DEBUG] Creating new workspace:", name);
      
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create space");
      }
      
      const createdWorkspace = await res.json();
      console.log("[DEBUG] Workspace created successfully:", createdWorkspace);
      
      const newSpace = {
        id: createdWorkspace.id,
        name: createdWorkspace.name,
        createdAt: createdWorkspace.createdAt || new Date().toISOString(),
        contents: []
      };
      
      addSpace(newSpace);
      
      // Refresh without flashing
      await refreshSpaces(user.token, true);
      
      toast.success('Workspace created successfully!');
    } catch (error) {
      console.error('Error creating space:', error);
      toast.error('Failed to create workspace');
      throw error;
    }
  };

  // Handle pasting lessons to a workspace
  const handlePasteLessons = async (targetWorkspaceId: string) => {
    if (!user?.token || !copiedLessons.length) return;
    
    try {
      const lessonIds = copiedLessons.map(lesson => lesson.id);
      
      const res = await fetch(`/api/workspaces/${targetWorkspaceId}/copy-lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ lessonIds }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to paste lessons");
      }
      
      const result = await res.json();
      
      if (result.copiedCount > 0) {
        toast.success(`Successfully pasted ${result.copiedCount} lesson(s)!`);
        if (result.skippedCount > 0) {
          toast.info(`${result.skippedCount} lesson(s) were already in this workspace`);
        }
      } else {
        toast.info("All lessons were already in this workspace");
      }
      
      // Clear clipboard after successful paste
      clearClipboard();
      
      // Refresh spaces to show updated content
      await refreshSpaces(user.token, true);
      
    } catch (error) {
      console.error("Error pasting lessons:", error);
      toast.error(error instanceof Error ? error.message : "Failed to paste lessons");
    }
  };

  // Handle space deletion
  const handleDeleteSpace = async (spaceId: string) => {
    if (!user?.token) return;
    
    // Find the workspace being deleted
    const workspaceToDelete = spaces.find(s => s.id === spaceId);
    if (!workspaceToDelete) return;

    try {
      // First, delete the workspace
      const res = await fetch(`/api/workspaces/${spaceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to delete space");
      
      // Find the Personal Workspace
      const personalWorkspace = spaces.find(s => 
        s.name.trim().toLowerCase() === "personal workspace"
      );
      
      if (personalWorkspace && workspaceToDelete.contents?.length) {
        // Delete all contents of this workspace from the Personal Workspace
        const deletePromises = workspaceToDelete.contents.map(content => 
          fetch(`/api/contents/${content.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${user.token}` },
          })
        );
        
        await Promise.all(deletePromises);
      }
      
      toast.success("Workspace and its contents deleted successfully!");
      // Refresh spaces to get the latest state
      await refreshSpaces(user.token, true);
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace");
    }
  };

  return (
    <div className="min-h-full bg-[#FAF7F8] dark:bg-gray-900">
      <main className="container py-8 px-4 md:px-8">
        <div className="flex justify-between items-start w-full mb-8">
          <h2 className="text-4xl font-bold tracking-tight pt-4 text-[#5B4B8A] dark:text-white">
            My Workspaces
          </h2>
          <BackButton onClick={() => router.push("/dashboard")} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <div key={space.id} className="group relative bg-card dark:bg-gray-800 rounded-xl border border-border p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <Link
                href={`/dashboard/workspaces/${space.id}`}
                className="flex-1 min-w-0"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-[#5B4B8A] dark:group-hover:text-[#C7AFFF] transition-colors">
                  {space.name}
                </h3>
              </Link>
              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-1 rounded-full hover:bg-[#E58C5A]/80 dark:hover:bg-[#E58C5A]/90 focus:outline-none"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-5 w-5 text-black dark:text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {hasCopiedLessons && (
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        onSelect={(e) => {
                          e.preventDefault();
                          handlePasteLessons(space.id);
                        }}
                      >
                        <Clipboard className="h-4 w-4 mr-2" />
                        Paste ({copiedLessons.length})
                      </DropdownMenuItem>
                    )}
                    {!(space.name.toLowerCase().includes("personal") && space.name.toLowerCase().includes("workspace")) && (
                      <DropdownMenuItem 
                        className="text-red-500 cursor-pointer" 
                        onSelect={(e) => {
                          e.preventDefault();
                          handleDeleteSpace(space.id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-200 mt-auto">
              {space.contents?.length || 0} items
            </p>
          </div>
          ))}
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-white/50 p-6 hover:border-primary/30 dark:hover:border-white/70 transition-colors bg-[#fffefc] dark:bg-gray-800 hover:shadow-lg h-full">
            <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
              <Button variant="ghost" className="h-auto p-4 w-full flex items-center justify-center gap-2 group hover:bg-transparent">
                <PlusCircle className="h-4 w-4 text-muted-foreground dark:text-white/80 group-hover:text-primary/80 dark:group-hover:text-white transition-colors" />
                <span className="text-sm font-medium dark:text-white/80 group-hover:text-primary/80 dark:group-hover:text-white transition-colors">New Workspace</span>
              </Button>
            </CreateSpaceDialog>
          </div>
        </div>
      </main>
    </div>
  );
}
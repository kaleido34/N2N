"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import type { SpaceItem } from "@/hooks/space-provider";
import { Box, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalLoading } from "@/components/LayoutClient";
import { toast } from "sonner";

export default function WorkspacesPage() {
  const { isAuthenticated, user } = useAuth();
  const { spaces, loading } = useSpaces();
  const router = useRouter();
  const { show, setShow } = useGlobalLoading();
  const [localSpaces, setLocalSpaces] = useState(spaces);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    console.log("[WorkspacesPage] spaces:", spaces);
    setLocalSpaces(spaces);
  }, [spaces]);

  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  const handleDeleteSpace = async (spaceId: string) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete space");
      setLocalSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      toast.success("Workspace deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workspace");
    }
  };

  // Find and pin the default workspace
  const defaultWorkspace = localSpaces.find(
    (space) => space.id === "default" || space.name.toLowerCase().includes("default")
  );
  const otherWorkspaces = localSpaces.filter(
    (space) => !(space.id === "default" || space.name.toLowerCase().includes("default"))
  );

  // Helper to render a workspace card
  const renderWorkspaceCard = (space: SpaceItem, isDefault = false) => (
    <div
      key={space.id}
      className="group relative rounded-lg border p-6 hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <button
          className="flex-1 text-left bg-transparent border-none outline-none cursor-pointer"
          onClick={() => {
            setShow(true);
            router.push(`/dashboard/spaces/${space.id}`);
          }}
        >
          <h3 className="font-semibold tracking-tight">
            {isDefault ? "Personal Workspace" : space.name}
          </h3>
        </button>
        {!isDefault && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-red-500"
                onClick={() => handleDeleteSpace(space.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-full dark:bg-gray-900">
      <main className="container py-6">
        <div className="flex flex-col space-y-8">
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight" style={{color: '#5B4B8A'}}>My Workspace</h2>
              <BackButton />
            </div>
            <div className="grid gap-4 grid-cols-3">
              {defaultWorkspace && renderWorkspaceCard(defaultWorkspace, true)}
              {otherWorkspaces.slice(0, 3 - (defaultWorkspace ? 1 : 0)).map((space) => renderWorkspaceCard(space))}
            </div>
            {otherWorkspaces.length > 3 - (defaultWorkspace ? 1 : 0) && (
              <div className="grid gap-4 grid-cols-3 mt-4">
                {otherWorkspaces.slice(3 - (defaultWorkspace ? 1 : 0)).map((space) => renderWorkspaceCard(space))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
} 
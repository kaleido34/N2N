"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { Box, Briefcase } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SpacesPage() {
  const { isAuthenticated, user } = useAuth();
  const { spaces, loading, addSpace, refreshSpaces } = useSpaces();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    console.log("[SpacesPage] spaces:", spaces);
  }, [spaces]);

  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  async function handleCreateSpace(name: string) {
    console.log("[handleCreateSpace] called with:", name);
    if (!user?.token) {
      toast.error("You must be logged in to create a workspace");
      return;
    }

    try {
      console.log("[handleCreateSpace] about to fetch");
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name }),
      });
      console.log("[handleCreateSpace] fetch finished", res);

      if (!res.ok) {
        const error = await res.json();
        console.log("[handleCreateSpace] fetch error", error);
        throw new Error(error.message || "Failed to create space");
      }

      const created = await res.json();
      console.log("[handleCreateSpace] created:", created);

      addSpace({
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
        contents: [],
      });

      await refreshSpaces(user.token);
      console.log("[handleCreateSpace] after refreshSpaces");

      toast.success("Workspace created successfully!");
    } catch (error) {
      console.error("Error creating space:", error);
      toast.error("Failed to create workspace. Please try again.");
      throw error;
    }
  }

  return (
    <div className="min-h-full dark:bg-gray-900">
      <main className="container py-6">
        <div className="flex flex-col space-y-8">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">My spaces</h2>
              <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
                <Button className="font-semibold bg-gradient-to-r from-[#E58C5A] to-[#7B5EA7] hover:from-[#e5a05a] hover:to-[#684b9e] text-white shadow-none rounded-lg">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Create Workspace
                </Button>
              </CreateSpaceDialog>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map((space) => (
                <Link
                  key={space.id}
                  href={`/dashboard/spaces/${space.id}`}
                  className="group relative rounded-lg border p-6 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold tracking-tight">
                        {space.name}
                      </h3>
                    </div>
                    <Box className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
              <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
                <Button className="h-[116px] justify-center rounded-lg border border-dashed w-full font-semibold bg-gradient-to-r from-[#E58C5A] to-[#7B5EA7] hover:from-[#e5a05a] hover:to-[#684b9e] text-white shadow-none">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Create Workspace
                </Button>
              </CreateSpaceDialog>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
} 
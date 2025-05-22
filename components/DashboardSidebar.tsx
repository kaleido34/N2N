import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CustomThemeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Plus, FolderOpen, Sparkles, BookOpen, Briefcase, MoreVertical, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/auth-provider";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { useSpaces } from "@/hooks/space-provider";
import { toast } from "sonner";
import { ThemeToggleButton } from "@/components/mode-toggle";

// SVG for rectangular sidebar icon
const PanelIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <rect x="3" y="3" width="7" height="18" rx="2" />
  </svg>
);

export default function DashboardSidebar({ minimized, setMinimized }: { minimized: boolean; setMinimized: (v: boolean) => void }) {
  const { user, logout } = useAuth();
  const { spaces, addSpace, refreshSpaces, setSpaces } = useSpaces();
  const router = useRouter ? useRouter() : { push: () => {} };
  const getInitials = (name: string) => name?.split(" ").map((part: string) => part[0]).join("").toUpperCase();

  // Find the default/personal workspace
  const defaultWorkspace = spaces.find(
    (space) => space.id === "default" || space.name.toLowerCase().includes("default")
  );
  // Defensive: fallback to empty array if not found
  const lessonHistory = defaultWorkspace?.contents || [];

  // Local state for deleting lessons from history (optimistic update)
  const [history, setHistory] = React.useState(lessonHistory);
  React.useEffect(() => {
    setHistory(lessonHistory);
  }, [lessonHistory]);

  // Delete lesson handler
  const handleDeleteLesson = async (lessonId: string) => {
    if (!user?.token) return;
    try {
      // Delete from backend
      const res = await fetch(`/api/contents/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      // Optimistically update UI
      setHistory((prev) => prev.filter((item) => item.id !== lessonId));
      // Also update global store
      if (defaultWorkspace) {
        setSpaces(
          spaces.map((space) =>
            space.id === defaultWorkspace.id
              ? { ...space, contents: (space.contents || []).filter((item) => item.id !== lessonId) }
              : space
          )
        );
      }
      toast.success("Lesson deleted from history!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete lesson");
    }
  };

  async function handleCreateSpace(name: string) {
    if (!user?.token) {
      toast.error("You must be logged in to create a workspace");
      return;
    }
    try {
      const res = await fetch("/api/spaces", {
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
      const created = await res.json();
      addSpace({
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
        contents: [],
      });
      await refreshSpaces(user.token);
      toast.success("Workspace created successfully!");
    } catch (error) {
      console.error("Error creating space:", error);
      toast.error("Failed to create workspace. Please try again.");
      throw error;
    }
  }

  return (
    <aside className={`flex flex-col h-screen bg-white/80 dark:bg-[#18132A]/80 border-r border-sidebar-border transition-all duration-300 z-50 ${minimized ? 'w-16' : 'w-64'} relative ${!minimized ? 'pl-3' : ''}`}> 
      {/* Header */}
      <div className={`flex items-center justify-between px-3 pt-5 pb-5 border-b border-sidebar-border bg-white/80 dark:bg-[#18132A]/80 ${minimized ? '' : ''}`}>
        {!minimized && (
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-110" />
            <span className="font-extrabold text-xl text-[#232323] dark:text-white tracking-tight transition-transform duration-200 group-hover:scale-110">Noise2Nectar</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={() => setMinimized(!minimized)} className={`rounded-md hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] ml-auto ${minimized ? '' : ''}`}>
          {minimized ? <ArrowRight className="h-5 w-5" /> : <PanelIcon className="h-6 w-6" />}
        </Button>
      </div>

      {/* Main Scrollable Area */}
      <div className={`flex-1 overflow-y-auto py-4 flex flex-col gap-3 bg-transparent border-r-0 ${!minimized ? 'px-2' : ''}`}>
        {/* New Lesson Button */}
        {minimized ? (
          <button
            className="flex items-center justify-center h-9 w-9 mx-auto rounded-lg bg-gradient-to-br from-[#7B5EA7]/20 to-[#E58C5A]/20 hover:from-[#7B5EA7]/40 hover:to-[#E58C5A]/40 focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] transition-colors"
            onClick={() => router.push('/dashboard')}
            aria-label="New Lesson"
            type="button"
          >
            <BookOpen className="h-5 w-5 text-[#7B5EA7] dark:text-[#C7AFFF]" />
          </button>
        ) : (
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/10 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group"
            onClick={() => router.push('/dashboard')}
          >
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-[#7B5EA7]/20 to-[#E58C5A]/20 group-hover:from-[#7B5EA7]/40 group-hover:to-[#E58C5A]/40 mr-3 transition-colors">
              <BookOpen className="h-6 w-6 text-[#7B5EA7] dark:text-[#C7AFFF]" />
            </span>
            New Lesson
          </Button>
        )}
        {/* Visit Workspace Button */}
        {minimized ? (
          <button
            className="flex items-center justify-center h-9 w-9 mx-auto rounded-lg bg-[#F3F0FF] dark:bg-[#23223A] hover:bg-[#7B5EA7]/20 focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] transition-colors"
            onClick={() => router.push('/dashboard/workspaces')}
            aria-label="Visit Workspace"
            type="button"
          >
            <FolderOpen className="h-5 w-5 text-[#7B5EA7] dark:text-[#C7AFFF]" />
          </button>
        ) : (
          <Button
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#7B5EA7]/10 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group"
            onClick={() => router.push('/dashboard/workspaces')}
          >
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#F3F0FF] dark:bg-[#23223A] group-hover:bg-[#7B5EA7]/20 mr-3 transition-colors">
              <FolderOpen className="h-6 w-6 text-[#7B5EA7] dark:text-[#C7AFFF]" />
            </span>
            Visit Workspace
          </Button>
        )}
        {/* Create Workspace Button */}
        {minimized ? (
          <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
            <button
              className="flex items-center justify-center h-9 w-9 mx-auto rounded-lg bg-[#FFF6ED] dark:bg-[#2A1A13] hover:bg-[#E58C5A]/20 focus:outline-none focus:ring-2 focus:ring-[#E58C5A] transition-colors"
              aria-label="Create Workspace"
              type="button"
            >
              <Plus className="h-5 w-5 text-[#E58C5A] dark:text-[#E58C5A]" />
            </button>
          </CreateSpaceDialog>
        ) : (
          <CreateSpaceDialog onCreateSpace={handleCreateSpace}>
            <Button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/10 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#FFF6ED] dark:bg-[#2A1A13] group-hover:bg-[#E58C5A]/20 mr-3 transition-colors">
                <Plus className="h-6 w-6 text-[#E58C5A] dark:text-[#E58C5A]" />
              </span>
              Create Workspace
            </Button>
          </CreateSpaceDialog>
        )}
        {/* History Section (only in expanded mode) */}
        {!minimized && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold text-[#E58C5A] dark:text-[#E58C5A] uppercase tracking-wide pl-6">History</div>
            <div className="flex flex-col gap-1">
              {history.length === 0 && (
                <div className="text-xs text-muted-foreground pl-6 py-2">No lessons yet.</div>
              )}
              {history.map(lesson => (
                <div
                  key={lesson.id}
                  className="truncate text-xs text-[#232323] px-2 py-1 group hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] rounded transition cursor-pointer pl-6 flex items-center justify-between"
                >
                  <span className="truncate max-w-[120px]">{lesson.title || 'Untitled'}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 opacity-70 group-hover:opacity-100 hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteLesson(lesson.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer (absolute bottom) */}
      <div className="w-full flex items-center justify-between px-4 py-3 border-t border-sidebar-border bg-white/80 dark:bg-[#18132A]/80 absolute bottom-0 left-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
              <AvatarFallback className="bg-[#66529C] text-white font-semibold">{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2 dark:bg-[#18132A] rounded-xl shadow-lg">
            <DropdownMenuItem onSelect={() => router.push && router.push("/settings")}> <Settings className="mr-2 h-4 w-4" /> <span>Settings</span> </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logout && logout()}> <LogOut className="mr-2 h-4 w-4" /> <span>Log out</span> </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Theme toggle only in expanded mode */}
        {!minimized && <ThemeToggleButton />}
      </div>
    </aside>
  );
}
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

// SVG for rectangular sidebar icon
const PanelIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <rect x="3" y="3" width="7" height="18" rx="2" />
  </svg>
);

// Placeholder for recent lessons
const recentLessons = [
  { id: 1, title: "Photosynthesis" },
  { id: 2, title: "Quantum Mechanics" },
  { id: 3, title: "World War II" },
];

export default function DashboardSidebar({ minimized, setMinimized }: { minimized: boolean; setMinimized: (v: boolean) => void }) {
  const { user, logout } = useAuth();
  const router = useRouter ? useRouter() : { push: () => {} };
  const getInitials = (name: string) => name?.split(" ").map((part: string) => part[0]).join("").toUpperCase();

  return (
    <aside className={`flex flex-col h-screen bg-white/80 dark:bg-[#18132A]/80 border-r border-sidebar-border transition-all duration-300 z-50 ${minimized ? 'w-14' : 'w-64'} relative ${!minimized ? 'pl-3' : ''}`}> 
      {/* Header */}
      <div className={`flex items-center justify-between px-3 pt-3 pb-2 border-b border-sidebar-border bg-white/80 dark:bg-[#18132A]/80 ${minimized ? '' : ''}`}>
        {!minimized && (
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-110" />
            <span className="font-extrabold text-lg text-[#232323] dark:text-white tracking-tight transition-transform duration-200 group-hover:scale-110">Noise2Nectar</span>
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
          <CreateSpaceDialog onCreateSpace={() => {}}>
            <button
              className="flex items-center justify-center h-9 w-9 mx-auto rounded-lg bg-[#FFF6ED] dark:bg-[#2A1A13] hover:bg-[#E58C5A]/20 focus:outline-none focus:ring-2 focus:ring-[#E58C5A] transition-colors"
              aria-label="Create Workspace"
              type="button"
            >
              <Plus className="h-5 w-5 text-[#E58C5A] dark:text-[#E58C5A]" />
            </button>
          </CreateSpaceDialog>
        ) : (
          <CreateSpaceDialog onCreateSpace={() => {}}>
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
              {recentLessons.map(lesson => (
                <div key={lesson.id} className="truncate text-xs text-[#232323] px-2 py-1 hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] rounded transition cursor-pointer pl-6 flex items-center justify-between">
                  <span>{lesson.title}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
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
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2 dark:bg-[#18132A] rounded-xl shadow-lg">
            <DropdownMenuItem onSelect={() => router.push && router.push("/settings")}> <Settings className="mr-2 h-4 w-4" /> <span>Settings</span> </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logout && logout()}> <LogOut className="mr-2 h-4 w-4" /> <span>Log out</span> </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Theme toggle only in expanded mode */}
        {!minimized && <CustomThemeToggle />}
      </div>
    </aside>
  );
} 
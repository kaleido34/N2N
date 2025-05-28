"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggleButton } from "@/components/mode-toggle";
import { BookOpen, Brain, MessageSquare, Zap, BookMarked, Lightbulb } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/auth-provider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RightSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const getInitials = (name: string) => name?.split(" ").map((part: string) => part[0]).join("").toUpperCase();

  return (
    <aside className="flex flex-col h-screen bg-white/80 dark:bg-[#11001C] border-r border-sidebar-border w-64 relative pl-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-5 pb-5 border-b border-sidebar-border bg-white/80 dark:bg-[#11001C]">
        <div className="flex items-center gap-2 group">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-110" />
          <span className="font-extrabold text-xl text-[#232323] dark:text-white tracking-tight transition-transform duration-200 group-hover:scale-110">Noise2Nectar</span>
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent scrollbar-thumb-rounded-md dark:scrollbar-thumb-gray-600">
        {/* Custom scrollbar styles */}
        <style jsx>{`
          .scrollbar-thin::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #c1c1c1;
            border-radius: 4px;
          }
          .dark .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #4b5563;
          }
          .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 transparent;
          }
          .dark .scrollbar-thin {
            scrollbar-color: #4b5563 transparent;
          }
        `}</style>
        
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 px-2">
          <Zap className="h-5 w-5 text-[#E58C5A]" />
          Interact and Learn
        </h3>
        <div className="space-y-2">
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#f3f0ff] dark:hover:bg-[#FFA07A]/40 text-[#232323] dark:text-white shadow-none rounded-lg my-2 transition-colors group h-12"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-[#7B5EA7]/20 to-[#E58C5A]/20 group-hover:from-[#7B5EA7]/40 group-hover:to-[#E58C5A]/40 dark:group-hover:bg-[#E58C5A]/40 mr-3 transition-colors">
              <BookOpen className="h-6 w-6 text-[#7B5EA7] dark:text-[#C7AFFF]" />
            </span>
            Study Guide
          </Button>
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#f3f0ff] dark:hover:bg-[#FFA07A]/40 text-[#232323] dark:text-white shadow-none rounded-lg my-2 transition-colors group h-12"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[#F3F0FF] dark:bg-[#23223A] group-hover:bg-[#f3f0ff] dark:group-hover:bg-[#FFA07A]/40 mr-3 transition-colors">
              <Brain className="h-6 w-6 text-[#7B5EA7] dark:text-[#C7AFFF]" />
            </span>
            Practice Quiz
          </Button>
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#f3f0ff] dark:hover:bg-[#FFA07A]/40 text-[#232323] dark:text-white shadow-none rounded-lg my-2 transition-colors group h-12"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[#FFF6ED] dark:bg-[#2A1A13] group-hover:bg-[#FFF6ED] dark:group-hover:bg-[#FFA07A]/40 mr-3 transition-colors">
              <MessageSquare className="h-6 w-6 text-[#E58C5A] dark:text-[#E58C5A]" />
            </span>
            Discussion
          </Button>
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#f3f0ff] dark:hover:bg-[#FFA07A]/40 text-[#232323] dark:text-white shadow-none rounded-lg my-2 transition-colors group h-12"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[#F3F0FF] dark:bg-[#23223A] group-hover:bg-[#f3f0ff] dark:group-hover:bg-[#FFA07A]/40 mr-3 transition-colors">
              <Lightbulb className="h-6 w-6 text-[#7B5EA7] dark:text-[#C7AFFF]" />
            </span>
            Key Concepts
          </Button>
          <Button 
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#f3f0ff] dark:hover:bg-[#FFA07A]/40 text-[#232323] dark:text-white shadow-none rounded-lg my-2 transition-colors group h-12"
          >
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[#FFF6ED] dark:bg-[#2A1A13] group-hover:bg-[#FFF6ED] dark:group-hover:bg-[#FFA07A]/40 mr-3 transition-colors">
              <BookMarked className="h-6 w-6 text-[#E58C5A] dark:text-[#E58C5A]" />
            </span>
            Save for Later
          </Button>
        </div>
      </div>

      {/* Footer (absolute bottom) */}
      <div className="w-full flex items-center justify-between px-4 py-3 border-t border-sidebar-border bg-white/80 dark:bg-[#18132A]/80 absolute bottom-0 left-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
              <AvatarFallback className="bg-[#66529C] text-white font-semibold">
                {user?.name ? getInitials(user.name) : "DM"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2 dark:bg-[#18132A] rounded-xl shadow-lg">
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logout && logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggleButton />
      </div>
    </aside>
  );
}

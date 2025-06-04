"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggleButton } from "@/components/mode-toggle";
import { 
  ListTodo, 
  FileText, 
  BrainCircuit, 
  Gamepad2, 
  Headphones, 
  MessageSquare, 
  Zap 
} from "lucide-react";
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

// Import dialog components
import { QuizDialog } from "./QuizDialog";
import { FlashcardsDialog } from "./FlashcardsDialog";
import { MindmapDialog } from "./MindmapDialog";
import { ConceptMatchDialog } from "./ConceptMatchDialog";
import { TermBuilderDialog } from "./TermBuilderDialog";
import { AudioPlayer } from "./AudioPlayer";
import { TranscriptsDialog } from "./TranscriptsDialog";

// Add type for contentTitle if available


interface RightSidebarProps {
  contentId?: string;
  youtubeId?: string;
  mindmapData: any;
  mindmapLoading: boolean;
  quizData: any;
  quizLoading: boolean;
  flashcardsData: any;
  flashcardsLoading: boolean;
  audioData: any;
  audioLoading: boolean;
  transcriptData: any;
  transcriptLoading: boolean;
}

export default function RightSidebar({
  contentId,
  youtubeId,
  mindmapData,
  mindmapLoading,
  quizData,
  quizLoading,
  flashcardsData,
  flashcardsLoading,
  audioData,
  audioLoading,
  transcriptData,
  transcriptLoading,
  contentTitle // <-- add contentTitle if available
}: RightSidebarProps & { contentTitle?: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const getInitials = (name: string) => name?.split(" ").map((part: string) => part[0]).join("").toUpperCase();

  return (
    <aside className="flex flex-col h-screen bg-[#FAF7F8] dark:bg-[#11001C] border-l border-sidebar-border w-72 relative pl-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-5 pb-5 border-b border-sidebar-border bg-[#FAF7F8] dark:bg-[#11001C]">
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
        
        <h3 className="text-base font-semibold mb-4 px-2 text-gray-700 dark:text-gray-200">
          Interact and Learn
        </h3>
        <div className="space-y-1 px-2">
          {/* Take a Quiz */}
          <QuizDialog 
            quizData={quizData}
            quizLoading={quizLoading}
            contentId={contentId}
            youtubeId={youtubeId}
          />

          {/* View Flashcards */}
          <FlashcardsDialog 
            flashcardsData={flashcardsData}
            flashcardsLoading={flashcardsLoading}
            contentId={contentId}
            youtubeId={youtubeId}
          />

          {/* Create Mindmap */}
          <MindmapDialog 
            mindmapData={mindmapData}
            mindmapLoading={mindmapLoading}
            contentId={contentId}
            youtubeId={youtubeId}
          />

          {/* Concept Match */}
          <ConceptMatchDialog 
            contentId={contentId}
            youtubeId={youtubeId}
          />

          {/* Concept Builder */}
          <TermBuilderDialog 
            contentId={contentId}
            youtubeId={youtubeId}
          />

          {/* Listen Audio */}
          <button 
            onClick={() => setShowAudioPlayer(!showAudioPlayer)}
            className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12"
          >
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 mr-3 transition-colors">
              <Headphones className="h-5 w-5 text-white" />
            </div>
            Listen Audio
          </button>

          {/* Transcripts */}
          <TranscriptsDialog 
            transcriptData={transcriptData}
            transcriptLoading={transcriptLoading}
            contentId={contentId}
            youtubeId={youtubeId}
          />
        </div>
      </div>

      {/* Footer (absolute bottom) */}
      <div className="w-full flex items-center justify-between px-4 py-3 border-t border-b border-sidebar-border bg-[#FAF7F8] dark:bg-[#18132A]/80 absolute bottom-0 left-0">
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

      {/* Audio Player */}
      <AudioPlayer 
        isVisible={showAudioPlayer}
        onClose={() => setShowAudioPlayer(false)}
        audioData={audioData}
        audioLoading={audioLoading}
        contentId={contentId}
        youtubeId={youtubeId}
        contentTitle={contentTitle}
      />
    </aside>
  );
}

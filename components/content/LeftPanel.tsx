"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Lightbulb, Layers, Network, Headphones } from "lucide-react";
import Image from "next/image";
import { ThemeToggleButton } from "@/components/mode-toggle";

interface LeftPanelProps {
  id: string;
  activeVideoTab: string;
  setActiveVideoTab: (value: string) => void;
}

interface TranscriptSegment {
  time: string;
  text: string;
}

export default function LeftPanel({
  id,
  activeVideoTab,
  setActiveVideoTab,
}: LeftPanelProps) {
  // const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [youtube_id, setYoutube_id] = useState("");
  const router = useRouter();

  // Transcript parser function
  const parseTranscript = (
    rawTranscript: TranscriptSegment[] | undefined | null
  ): TranscriptSegment[] => {
    if (!Array.isArray(rawTranscript)) return [];
    return rawTranscript.map((segment) => ({
      ...segment,
      text: segment.text.replace(/&amp;#39;/g, "'"), // Replace all occurrences of &amp;#39; with '
    }));
  };

  const fetchTranscriptAndVideoDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/contents?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch video details");
      const data = await res.json();
      // REMOVE noisy debug logs
      setYoutube_id(data.youtube_id);
      setThumbnailUrl(data.thumbnailUrl || null);
      // Only parse transcript if it exists (YOUTUBE_CONTENT)
      if (data.transcript) {
        const parsedTranscript = parseTranscript(data.transcript);
        setTranscript(parsedTranscript);
      } else {
        setTranscript([]);
      }
    } catch (error) {
      console.error("Error fetching transcript and video details:", error);
    }
  }, [id]);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/contents?id=${id}`); // Replace with the actual chapters route
      if (!res.ok) throw new Error("Failed to fetch chapters");
      await res.json();
      // setChapters(data.chapters); // Assuming chapters are part of the API response
    } catch (error) {
      console.error("Error fetching chapters:", error);
    }
  }, [id]);

  useEffect(() => {
    // Fetch transcript and video details on mount
    fetchTranscriptAndVideoDetails();
  }, [id, fetchTranscriptAndVideoDetails]);

  useEffect(() => {
    if (activeVideoTab === "chapters") {
      // Fetch chapters when switching to the chapters tab
      fetchChapters();
    }
  }, [activeVideoTab, fetchChapters]);

  return (
    <div className="w-full flex flex-col items-center relative min-h-screen">
      {/* Website Logo and Name with Theme Toggler */}
      <div className="flex flex-col w-full mb-3">
        <div className="flex items-center justify-between px-3 pt-0 pb-5 border-b border-sidebar-border bg-white/80 dark:bg-[#18132A]/80">
          <div className="flex items-center gap-2 group cursor-pointer transition-transform duration-200 hover:scale-110" onClick={() => router.push('/dashboard')}> 
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-lg shadow-sm" />
            <span className="font-extrabold text-xl text-[#232323] dark:text-white tracking-tight">Noise2Nectar</span>
          </div>
          <ThemeToggleButton />
        </div>
      </div>
      {/* Video Thumbnail */}
      {thumbnailUrl && (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <img
            src={thumbnailUrl}
            alt="Video Thumbnail"
            className="object-cover w-full h-full"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
          />
        </div>
      )}
      {/* View Transcript Button */}
      <Button
        variant="outline"
        className="w-full flex items-center gap-2 justify-center text-[#5B4B8A] border-[#5B4B8A] font-semibold text-base"
        onClick={() => router.push(`/content/${id}/transcript`)}
      >
        <FileText className="h-5 w-5" /> View Transcript
      </Button>
      {/* Interact and Learn Section */}
      <div className="w-full bg-[#F8F6FF] dark:bg-[#23223a] rounded-xl p-4 flex flex-col gap-3">
        <div className="font-bold text-[#5B4B8A] text-base mb-2">Interact and Learn</div>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-center text-[#E58C5A] border-[#E58C5A] font-semibold text-base"
          onClick={() => router.push(`/content/${id}/quiz`)}
        >
          <Lightbulb className="h-5 w-5" /> Take a Quiz
        </Button>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-center text-[#7B5EA7] border-[#7B5EA7] font-semibold text-base"
          onClick={() => router.push(`/content/${id}/flashcards`)}
        >
          <Layers className="h-5 w-5" /> View Flashcards
        </Button>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-center text-[#5B4B8A] border-[#5B4B8A] font-semibold text-base"
          onClick={() => router.push(`/content/${id}/mindmap`)}
        >
          <Network className="h-5 w-5" /> Create Mindmap
        </Button>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 justify-center text-[#E58C5A] border-[#E58C5A] font-semibold text-base"
          onClick={() => router.push(`/content/${id}/games`)}
        >
          <Lightbulb className="h-5 w-5" /> Play Games
        </Button>
      </div>
      {/* Listen Audio Button (separate) */}
      <Button
        variant="outline"
        className="w-full flex items-center gap-2 justify-center text-[#E58C5A] border-[#E58C5A] font-semibold text-base"
        onClick={() => router.push(`/content/${id}/audio`)}
      >
        <Headphones className="h-5 w-5" /> Listen Audio
      </Button>
    </div>
  );
}

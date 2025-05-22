"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, ArrowRight, Loader2, Paperclip, FileText, Image as ImageIcon, Video, Music, ArrowRightCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { setSpaces, setLoading, loading, addContentToSpace } = useSpaces();
  const [minimized, setMinimized] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);

  const router = useRouter();

  // -------------------------------
  // 1) If not authenticated, redirect; otherwise fetch user's spaces once
  // -------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }

    async function fetchSpaces() {
      setLoading(true);
      try {
        const res = await fetch("/api/spaces", {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch spaces");
        const data = await res.json();
        setSpaces(data.spaces);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSpaces();
  }, [isAuthenticated, user?.token, router, setSpaces, setLoading]);

  if (!isAuthenticated || loading) {
    // Use branded loading overlay
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-[#18132A]/80 transition-colors duration-300">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-bounce">
            <img src="/logo.png" alt="Noise2Nectar Logo" width={80} height={80} className="rounded-2xl shadow-xl" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-[#7B5EA7] dark:text-[#C7AFFF] tracking-tight">Noise2Nectar</span>
            <span className="sr-only">Loading...</span>
          </div>
          <div className="mt-4">
            <span className="inline-block h-6 w-6 rounded-full border-4 border-[#7B5EA7] border-t-transparent animate-spin dark:border-[#C7AFFF] dark:border-t-transparent"></span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------
  // 2) Handle file uploads
  // -------------------------------
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // handle your upload logic here if needed
    }
  };

  // -------------------------------
  // 3) Submit a new content link
  // -------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // If user is on /dashboard/spaces/:spaceId
    const matched = pathname.match(/spaces\/([^/]+)/);
    const space_id = matched ? matched[1] : undefined;

    try {
      setIsLoading(true)
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
          user: JSON.stringify({ user_id: user?.user_id }),
        },
        body: JSON.stringify({
          youtube_url: inputValue.trim(),
          space_id, // pass the space from URL if it exists
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create content");
      }

      const json = await res.json();
      const { data } = json;

      // 3A) Update local store
      addContentToSpace(data.space_id, {
        id: data.content_id,
        youtube_id: data.youtube_id,
        type: data.type,
        title: data.title,
        thumbnailUrl: data.thumbnail_url,
      });

      // 3B) If user is in a specific space route, refresh so SpacePage sees the new item

      router.replace(`/dashboard/spaces/${data.space_id}`);
    } catch (err) {
      console.error("Error creating content:", err);
    } finally {
      setIsLoading(false)
      setInputValue("");
    }
  };

  // -------------------------------
  // 4) Render
  // -------------------------------
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden dark:bg-gray-900">
      {/* Sidebar */}
      <DashboardSidebar minimized={minimized} setMinimized={setMinimized} />
      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* What are you learning today section - only on main dashboard */}
        {pathname === '/dashboard' && (
          <section className="flex flex-1 flex-col items-center justify-center min-h-screen w-full bg-transparent">
            <div className="flex flex-col items-center justify-center w-full">
              <h1 className="text-6xl font-extrabold text-center mb-10" style={{color: '#5B4B8A', lineHeight: 1.1}}>What are you learning today?</h1>
              <form onSubmit={handleSubmit} className="w-full flex justify-center">
                <div className="relative w-full max-w-xl bg-white dark:bg-[#18132A] border border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col shadow-none mx-auto">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Paste a URL to get started..."
                    className="w-full px-6 py-5 text-base bg-transparent border-none outline-none rounded-2xl placeholder:text-gray-400 dark:placeholder:text-[#C7AFFF] text-[#232323] dark:text-white"
                  />
                  <div className="flex items-center gap-2 px-4 pb-4 pt-0">
                    <Button 
                      type="button"
                      variant="ghost"
                      className="flex items-center gap-2 px-3 py-2 text-base font-medium hover:bg-[#7B5EA7]/10"
                      style={{color: '#5B4B8A'}}
                      onClick={handleFileUpload}
                    >
                      <FileText className="h-5 w-5" /> Add PDF
                    </Button>
                    <DropdownMenu open={mediaDropdownOpen} onOpenChange={setMediaDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          type="button"
                          variant="ghost"
                          className="flex items-center gap-2 px-3 py-2 text-base font-medium hover:bg-[#7B5EA7]/10"
                          style={{color: '#5B4B8A'}}
                        >
                          <Paperclip className="h-5 w-5" /> Add Media
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}>
                          <ImageIcon className="h-4 w-4" /> Image
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => { fileInputRef.current?.setAttribute('accept', 'audio/*'); fileInputRef.current?.click(); }}>
                          <Music className="h-4 w-4" /> Audio
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => { fileInputRef.current?.setAttribute('accept', 'video/*'); fileInputRef.current?.click(); }}>
                          <Video className="h-4 w-4" /> Video
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    type="submit"
                    className="absolute right-4 bottom-4 h-10 w-10 rounded-xl bg-[#7B5EA7] dark:bg-[#C7AFFF] text-white dark:text-[#18132A] flex items-center justify-center shadow-md border-none p-0"
                    disabled={isLoading || !inputValue.trim()}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-6 w-6" />}
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="application/pdf,image/*,audio/*,video/*"
                />
              </form>
            </div>
          </section>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

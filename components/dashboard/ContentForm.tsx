"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Paperclip, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/**
 * Content form for the dashboard page
 * Allows adding YouTube URLs or uploading files to the personal workspace
 */
export function ContentForm() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { spaces, refreshSpaces } = useSpaces();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    try {
      const personalWorkspace = spaces.find(space => space.name === "Personal Workspace");
      if (!personalWorkspace) {
        toast.error("Personal Workspace not found");
        return;
      }

      try {
        const res = await fetch("/api/contents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            youtube_url: inputValue.trim(),
            space_id: personalWorkspace.id,
          }),
        });
        
        const responseData = await res.json();
        
        // Check for transcript errors (we use 200 status for these)
        if (responseData.error === 'NO_TRANSCRIPT' || responseData.error === 'TRANSCRIPT_ERROR') {
          toast.info(responseData.message || 'No transcript available for this video', {
            duration: 5000,
          });
          return;
        }
        
        // Handle other errors
        if (!res.ok) {
          throw new Error(responseData.message || responseData.error || 'Failed to create content');
        }

        // If we get here, the request was successful and we have a transcript
        toast.success("Content added to Personal Workspace!");
        
        // Refresh spaces and navigate
        if (user?.token && refreshSpaces) {
          await refreshSpaces(user.token, true);
        }
        
        router.push(`/dashboard/workspaces/${personalWorkspace.id}`);
        router.refresh();
        return;
        
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        toast.error(error instanceof Error ? error.message : 'An error occurred');
      }

      // Force refresh spaces after successful lesson creation
      if (user?.token && refreshSpaces) {
        try {
          await refreshSpaces(user.token, true);
          toast.success("Content added to Personal Workspace!");
          router.push(`/dashboard/workspaces/${personalWorkspace.id}`);
          router.refresh();
        } catch (error) {
          console.error("Error refreshing spaces:", error);
          toast.success("Content added to Personal Workspace!");
          router.push(`/dashboard/workspaces/${personalWorkspace.id}`);
        }
      } else {
        toast.success("Content added to Personal Workspace!");
        router.push(`/dashboard/workspaces/${personalWorkspace.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error("Error creating content:", err);
      // Use setTimeout to ensure the toast is shown after any potential UI updates
      setTimeout(() => {
        let errorMessage = 'Failed to add content';
        let isError = true;
        
        if (err instanceof Error) {
          // Use the error message directly from the server
          errorMessage = err.message;
          isError = true;
        }
        
        toast(errorMessage, {
          duration: 5000,
          style: {
            background: isError ? '#fef2f2' : '#f0fdf4',
            color: isError ? '#b91c1c' : '#166534',
            border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '400px',
            wordBreak: 'break-word'
          },
        });
      }, 0);
    } finally {
      setIsLoading(false);
      setInputValue("");
    }
  };



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const personalWorkspace = spaces.find(space => space.name === "Personal Workspace");
      if (!personalWorkspace) {
        toast.error("Personal Workspace not found");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.user_id || "");
      formData.append("spaceId", personalWorkspace.id);

      const res = await fetch("/api/contents/upload/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      toast.success("File uploaded to Personal Workspace!");
      router.push(`/dashboard/workspaces/${personalWorkspace.id}`);
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Failed to upload file");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
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
            className="flex items-center gap-2 px-3 py-2 text-base font-medium hover:bg-[#7B5EA7]/10 text-[#5B4B8A] dark:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-5 w-5" /> Add PDF
          </Button>
          <DropdownMenu open={mediaDropdownOpen} onOpenChange={setMediaDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                type="button"
                variant="ghost"
                className="flex items-center gap-2 px-3 py-2 text-base font-medium hover:bg-[#7B5EA7]/10 text-[#5B4B8A] dark:text-white"
              >
                <Paperclip className="h-5 w-5" /> Add Media
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 dark:bg-[#18132A] dark:border-gray-700">
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer dark:text-white"
 onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}>
                <ImageIcon className="h-4 w-4" /> Image
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer dark:text-white" onClick={() => { fileInputRef.current?.setAttribute('accept', 'audio/*'); fileInputRef.current?.click(); }}>
                <Music className="h-4 w-4" /> Audio
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer dark:text-white" onClick={() => { fileInputRef.current?.setAttribute('accept', 'video/*'); fileInputRef.current?.click(); }}>
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
          {isLoading ? <Loader2 className="animate-spin h-7 w-7" /> : <ArrowRight className="h-12 w-12 -rotate-90" />}
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
  );
}
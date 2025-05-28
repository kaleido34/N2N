"use client";

import React, { useState, useRef } from "react";
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

interface Space {
  id: string;
  name: string;
  contents?: any[];
}

export function ContentForm() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [showViewButton, setShowViewButton] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { spaces, refreshSpaces } = useSpaces();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      console.log("[DEBUG] Uploading file:", file.name);
      
      // Create FormData without specifying spaceId - let backend handle it
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.user_id || "");
      // Don't specify spaceId to let the backend create personal workspace if needed

      // Upload the file
      const res = await fetch("/api/contents/upload/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });

      // Parse response data
      let responseData;
      try {
        responseData = await res.json();
        console.log("[DEBUG] File upload response:", JSON.stringify(responseData));
      } catch (parseError) {
        console.error("[ERROR] Failed to parse response JSON:", parseError);
      }
      
      if (!res.ok) {
        throw new Error(responseData?.message || "Failed to upload file");
      }

      // Show success message
      toast.success("File uploaded successfully!");
      
      // Extract workspace ID from the response
      const workspaceId = responseData?.space_id || 
                         responseData?.content?.space_id;
                         
      if (workspaceId) {
        console.log("[DEBUG] Found workspace ID in response:", workspaceId);
        
        // Use setTimeout to let the success message appear before navigation
        setTimeout(() => {
          // Navigate to the workspace with the uploaded file
          const url = `/dashboard/workspaces/${workspaceId}?forceRefresh=true&t=${Date.now()}`;
          console.log("[DEBUG] Navigating to:", url);
          window.location.href = url;
        }, 500);
      } else {
        // If no workspace ID in response, fetch spaces to find personal workspace
        const spacesRes = await fetch("/api/spaces", {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        
        if (!spacesRes.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        
        const spacesData = await spacesRes.json();
        
        // Find personal workspace
        const personalWorkspace = spacesData.find((s: any) => 
          s.name?.toLowerCase?.().includes("personal") && 
          s.name?.toLowerCase?.().includes("workspace")
        );
        
        if (personalWorkspace?.id) {
          // Navigate to personal workspace
          setTimeout(() => {
            const url = `/dashboard/workspaces/${personalWorkspace.id}?forceRefresh=true&t=${Date.now()}`;
            console.log("[DEBUG] Navigating to:", url);
            window.location.href = url;
          }, 500);
        } else {
          // Fallback to workspaces page
          setTimeout(() => {
            window.location.href = '/dashboard/workspaces';
          }, 500);
        }
      }
    } catch (err) {
      console.error("[ERROR] Error uploading file:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      // Check if user is logged in
      if (!user?.token) {
        toast.error("You must be logged in to add content");
        setIsLoading(false);
        return;
      }

      // Find personal workspace
      let personalWorkspace = spaces.find(space => 
        space.name?.toLowerCase().includes("personal") && 
        space.name?.toLowerCase().includes("workspace"));
      
      console.log("[DEBUG] Personal workspace found:", personalWorkspace);
      
      // Create content data payload
      const contentData: any = {
        youtube_url: inputValue.trim(),
      };
      
      // If we have a personal workspace, include its ID
      if (personalWorkspace?.id) {
        contentData.space_id = personalWorkspace.id;
        console.log("[DEBUG] Using existing personal workspace ID:", personalWorkspace.id);
      } else {
        console.log("[DEBUG] No personal workspace found - letting backend create one");
        // Don't include space_id - server will create personal workspace
      }
      
      // Make the API call to create content
      console.log("[DEBUG] Creating content with data:", contentData);
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contentData),
      });
      
      // Get the response
      const responseData = await res.json();
      console.log("[DEBUG] Content creation response:", responseData);
      
      if (!res.ok) {
        throw new Error(responseData.message || responseData.error || "Failed to create content");
      }
      
      // Show success message
      toast.success("Content added successfully!");
      
      // Clear the input field
      setInputValue("");
      
      // Get the workspace ID from the response or use existing personal workspace
      const workspaceId = responseData?.space_id || 
                          responseData?.content?.space_id || 
                          personalWorkspace?.id;
      
      // Refresh the spaces list to ensure we have the latest data
      if (refreshSpaces) {
        console.log("[DEBUG] Refreshing spaces list");
        await refreshSpaces(user.token, true);
        
        // If we didn't have a personal workspace before, try to find it now
        if (!personalWorkspace) {
          const updatedSpaces = await fetch("/api/spaces", {
            headers: { Authorization: `Bearer ${user.token}` }
          }).then(res => res.json()).then(data => data.spaces);
          
          personalWorkspace = updatedSpaces?.find((space: any) => 
            space.name?.toLowerCase?.().includes("personal") && 
            space.name?.toLowerCase?.().includes("workspace"));
            
          console.log("[DEBUG] Found personal workspace after refresh:", personalWorkspace);
        }
      }
      
      // Determine which workspace ID to use for navigation
      const targetWorkspaceId = workspaceId || personalWorkspace?.id;
      
      if (targetWorkspaceId) {
        console.log("[DEBUG] Navigating to workspace:", targetWorkspaceId);
        
        // Use router.push with a timestamp for cache busting
        // This is smoother than window.location.href and preserves auth state
        const url = `/dashboard/workspaces/${targetWorkspaceId}?t=${Date.now()}`;
        router.push(url);
        
        // Refresh the router to trigger fresh data fetching without a full page reload
        router.refresh();
      } else {
        console.log("[DEBUG] No workspace ID found, navigating to workspaces list");
        router.push("/dashboard/workspaces");
        router.refresh();
      }
    } catch (error) {
      console.error("[ERROR] Content creation failed:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // No extra navigation functions needed

  return (
    <div className="w-full flex flex-col items-center justify-center">
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
      
      {/* No extra buttons needed */}
    </div>
  );
}
"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Music, Paperclip, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Space {
  id: string;
  name: string;
  contents?: any[];
}

export function ContentForm() {
  // Hooks
  const { user } = useAuth();
  const { spaces, refreshSpaces } = useSpaces();
  const router = useRouter();
  
  // State management
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaDropdownOpen, setMediaDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Find personal workspace
  const personalWorkspace = spaces?.find((space: any) => 
    space?.name?.toLowerCase?.().includes("personal") && 
    space?.name?.toLowerCase?.().includes("workspace")
  ) || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Set the file and update the input value with the file name
    setSelectedFile(file);
    setInputValue(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedFile) return;

    setIsLoading(true);
    try {
      // Check if user is logged in
      if (!user?.token) {
        toast.error("You must be logged in to add content");
        setIsLoading(false);
        return;
      }

      // Handle file upload if a file is selected
      if (selectedFile) {
        await handleFileUpload(selectedFile);
        return;
      }

      // Handle URL submission
      if (inputValue.trim()) {
        await handleUrlSubmission(inputValue.trim());
      }
      
    } catch (error) {
      console.error("[ERROR] Content creation failed:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.token) {
      toast.error("You must be logged in to upload files");
      return;
    }

    setIsUploading(true);
    try {
      console.log("[DEBUG] Uploading file:", file.name);
      
      // Create FormData with user ID and file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.user_id);
      
      // Use the filename without extension as the title
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      formData.append("title", fileNameWithoutExt);
      formData.append("filename", file.name); // Also send the full filename

      // Determine the correct API endpoint based on file type
      let endpoint = "/api/contents/upload/pdf";
      
      if (file.type.startsWith("image/")) {
        endpoint = "/api/contents/upload/image";
      } else if (file.type.startsWith("audio/")) {
        endpoint = "/api/contents/upload/audio";
      } else if (file.type === "application/pdf") {
        endpoint = "/api/contents/upload/pdf";
      }
      
      // Upload the file
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formData,
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData?.message || "Failed to upload file");
      }

      // Handle successful upload
      await handleUploadSuccess(responseData);
      
      // Clear the file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("[ERROR] Error uploading file:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmission = async (url: string) => {
    // Check if user is logged in
    if (!user?.token) {
      toast.error("You must be logged in to add content");
      return;
    }

    // Create content data payload
    const contentData: any = {
      youtube_url: url,
      title: url, // Use URL as default title, can be updated by the user
    };
    
    // If we have a personal workspace, include its ID
    if (personalWorkspace?.id) {
      contentData.space_id = personalWorkspace.id;
    }
    
    // Make the API call to create content
    const res = await fetch("/api/contents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contentData),
    });
    
    const responseData = await res.json();
    
    if (!res.ok) {
      throw new Error(responseData.message || responseData.error || "Failed to create content");
    }
    
    // Handle successful URL submission
    await handleUploadSuccess(responseData);
  };

  const handleUploadSuccess = async (responseData: any) => {
    // Show success message
    toast.success("Content added successfully!");
    
    // Clear the input field and selected file
    setInputValue("");
    setSelectedFile(null);
    
    // Get the workspace ID from the response or use existing personal workspace
    const workspaceId = responseData?.spaceId || 
                      responseData?.space_id || 
                      responseData?.content?.space_id ||
                      personalWorkspace?.id;      
    
    // Refresh the spaces list to ensure we have the latest data
    if (refreshSpaces && user?.token) {
      await refreshSpaces(user.token, true);
    }
    
    // Show message to user about redirection
    toast.success("Redirecting to your workspace...");
    
    // Use a short delay to ensure the toast is visible
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to the workspace
    if (workspaceId) {
      router.push(`/dashboard/workspaces/${workspaceId}?t=${Date.now()}`);
    } else {
      router.push('/dashboard/workspaces');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex justify-center">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#18132A] border border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col shadow-none mx-auto">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Paste a URL or upload a file to get started"
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
              <DropdownMenuItem 
                className="flex items-center gap-2 cursor-pointer dark:text-white"
                onClick={() => { 
                  fileInputRef.current?.setAttribute('accept', 'image/*'); 
                  fileInputRef.current?.click(); 
                }}
              >
                <ImageIcon className="h-4 w-4" /> Image
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2 cursor-pointer dark:text-white" 
                onClick={() => { 
                  fileInputRef.current?.setAttribute('accept', 'audio/*'); 
                  fileInputRef.current?.click(); 
                }}
              >
                <Music className="h-4 w-4" /> Audio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          type="submit"
          className="absolute right-4 bottom-4 h-10 w-10 rounded-xl bg-[#7B5EA7] dark:bg-[#C7AFFF] text-white dark:text-[#18132A] flex items-center justify-center shadow-md border-none p-0"
          disabled={isLoading || isUploading || (!inputValue.trim() && !selectedFile)}
        >
          {isLoading || isUploading ? (
            <Loader2 className="animate-spin h-7 w-7" />
          ) : (
            <ArrowRight className="h-12 w-12 -rotate-90" />
          )}
        </Button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="application/pdf,image/*,audio/*"
      />
    </form>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";

import { toast } from "sonner";

/**
 * Utility component with hooks for content actions in the dashboard
 */
export function useContentActions() {
  const router = useRouter();
  const { user } = useAuth();
  const { addContentToSpace, spaces } = useSpaces();


  /**

  /**
   * Handle URL submission for creating new content
   */
  const handleUrlSubmit = useCallback(async (
    url: string, 
    spaceId?: string,
    setIsLoading?: (loading: boolean) => void
  ) => {
    if (!url.trim()) return;
    try {
      setIsLoading?.(true);
      
      const personalWorkspace = spaces.find(space => space.name === "Personal Workspace");
      if (!personalWorkspace) {
        toast.error("Personal Workspace not found");
        return;
      }

      const res = await fetch("/api/contents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json",
          user: JSON.stringify({ user_id: user?.user_id }),
        },
        body: JSON.stringify({
          youtube_url: url.trim(),
          space_id: personalWorkspace.id,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to create content");
      }

      const json = await res.json();
      const { data } = json;

      addContentToSpace(personalWorkspace.id, {
        id: data.content_id,
        youtube_id: data.youtube_id,
        type: data.type,
        title: data.title,
        thumbnailUrl: data.thumbnail_url,
      });

      toast.success("Content added to Personal Workspace!");
      router.replace(`/dashboard/spaces/${personalWorkspace.id}`);
    } catch (err) {
      console.error("Error creating content:", err);
      toast.error("Failed to add content");
    } finally {
      setIsLoading?.(false);
    }
  }, [user, addContentToSpace, router, spaces]);

  /**
   * Handle file upload for creating new content
   */
  const handleFileUpload = useCallback(async (
    file: File,
    spaceId?: string,
    setIsLoading?: (loading: boolean) => void
  ) => {
    if (!file) return;
    
    try {
      setIsLoading?.(true);
      
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

      const { contentId, spaceId } = await res.json();
      
      addContentToSpace(spaceId, {
        id: contentId,
        type: "DOCUMENT_CONTENT",
        title: file.name,
      });
      
      toast.success("File uploaded successfully!");
      router.replace(`/dashboard/spaces/${spaceId}`);
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Failed to upload file");
    } finally {
      setIsLoading?.(false);
    }
  }, [user, addContentToSpace, router, spaces]);

  return {
    handleUrlSubmit,
    handleFileUpload
  };
}
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

interface CreateSpaceDialogProps {
  onCreateSpace: (name: string) => Promise<void>;
  children?: React.ReactNode;
}

export function CreateSpaceDialog({ onCreateSpace, children }: CreateSpaceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting workspace:", workspaceName);
    if (!workspaceName.trim()) return;

    setIsLoading(true);
    try {
      console.log("About to call onCreateSpace");
      await onCreateSpace(workspaceName);
      console.log("onCreateSpace finished");
      setWorkspaceName("");
      setOpen(false);
      toast.success("Workspace created successfully!");
    } catch (error) {
      console.error("Failed to create workspace:", error);
      toast.error("Failed to create workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="font-semibold bg-gradient-to-r from-[#E58C5A] to-[#7B5EA7] hover:from-[#e5a05a] hover:to-[#684b9e] text-white shadow-none rounded-lg">
            <Briefcase className="h-5 w-5 mr-2" />
            Create Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create new workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your content. You can add videos,
            documents, and more.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!workspaceName.trim() || isLoading}
              className="bg-[#5B4B8A] hover:bg-[#4a3a6a] text-white"
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

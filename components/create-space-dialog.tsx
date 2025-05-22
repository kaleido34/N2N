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

interface CreateSpaceDialogProps {
  onCreateSpace: (name: string) => void;
  children?: React.ReactNode; // Allow children to be passed
}

export function CreateSpaceDialog({ onCreateSpace, children }: CreateSpaceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceName.trim()) {
      onCreateSpace(workspaceName);
      setWorkspaceName("");
      setOpen(false);
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
          <DialogTitle style={{color: '#5B4B8A'}}>Create new workspace</DialogTitle>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!workspaceName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

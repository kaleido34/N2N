"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface LeftPanelProps {
  id: string;
  summary: string[];
  title: string;
}

export default function LeftPanel({ 
  id,
  summary,
  title 
}: LeftPanelProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-[#5B4B8A] dark:text-white">Overview</h1>
        <Button 
          onClick={handleBack}
          variant="ghost" 
          className="text-gray-600 hover:bg-orange-50 hover:text-orange-500 dark:text-gray-300 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Summary Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="prose dark:prose-invert max-w-none">
            {summary && summary.length > 0 ? (
              <div className="space-y-4">
                {summary.map((paragraph, idx) => (
                  <p key={idx} className="text-gray-700 dark:text-gray-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No summary available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LeftPanelProps {
  id: string;
  summary: Array<{
    type: 'heading' | 'paragraph' | 'list_item';
    level?: number;
    content: string;
  }>;
  title: string;
  loading?: boolean; // Added loading prop
}

export default function LeftPanel({ 
  id,
  summary,
  title,
  loading = false // Default to false if not provided
}: LeftPanelProps) {
  const router = useRouter();
  
  // Debug: Log summary data to see its structure
  React.useEffect(() => {
    console.log('LeftPanel summary type:', typeof summary, Array.isArray(summary));
    console.log('LeftPanel summary value:', summary);
  }, [summary]);

  const handleBack = () => {
    router.back();
  };

  // Render summary section based on type and level
  const renderSummarySection = (section: {
    type: 'heading' | 'paragraph' | 'list_item';
    level?: number;
    content: string;
  }) => {
    console.log('Rendering section:', typeof section, section);
    
    // Safety check for section structure
    if (!section || typeof section !== 'object') {
      return <p className="text-red-500">Invalid section format</p>;
    }
    
    const { type, content, level } = section;
    
    // Ensure content is a string to avoid [object Object] display
    const contentStr = typeof content === 'string' ? content : String(content || '');
    
    // Debug output to help diagnose the issue
    console.log(`Section type: ${type}, content type: ${typeof content}, stringified: ${contentStr}`);
    
    switch (type) {
      case 'heading': {
        // Use dynamic heading tag based on level with proper typing
        const headingLevel = level && level <= 6 ? level : 3;
        
        if (headingLevel === 1) {
          return (
            <h1 className="text-xl font-bold text-[#5B4B8A] dark:text-white mt-4 mb-2">
              {contentStr}
            </h1>
          );
        } else if (headingLevel === 2) {
          return (
            <h2 className="text-lg font-bold text-[#5B4B8A] dark:text-white mt-4 mb-2">
              {contentStr}
            </h2>
          );
        } else if (headingLevel === 3) {
          return (
            <h3 className="text-base font-semibold text-[#4A3E78] dark:text-gray-200 mt-3 mb-1">
              {contentStr}
            </h3>
          );
        } else {
          return (
            <h4 className="text-sm font-semibold text-[#4A3E78] dark:text-gray-200 mt-3 mb-1">
              {contentStr}
            </h4>
          );
        }
      }
        
      case 'list_item':
        return (
          <li className="text-gray-700 dark:text-gray-300 leading-relaxed my-1 ml-6 list-disc">
            {contentStr}
          </li>
        );
        
      case 'paragraph':
      default:
        // Check if paragraph has bold content with **text** pattern
        // Use a safe approach to check for patterns
        if (contentStr && contentStr.indexOf('**') !== -1) {
          // Text with bolded sections using **text**
          const parts = contentStr.split(/(\*\*.*?\*\*)/g);
          return (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed my-1">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  // Bold text
                  return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>;
                }
                return part;
              })}
            </p>
          );
        } else {
          // Regular paragraph
          return (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed my-1">
              {contentStr}
            </p>
          );
        }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6 mt-4 pl-4">
        <div className="flex items-center gap-3 pl-4">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#5B4B8A] dark:text-white">Overview</h1>
        </div>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mx-4 my-4">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-3 text-[#5B4B8A] dark:text-white">{title}</h2>
          <div className="prose dark:prose-invert max-w-none px-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <LoadingSpinner fullScreen={false} />
                <p className="text-gray-500 mt-3">Loading summary...</p>
              </div>
            ) : summary && summary.length > 0 ? (
              <div className="space-y-1">
                {summary.map((section, idx) => (
                  <React.Fragment key={idx}>
                    {renderSummarySection(section)}
                  </React.Fragment>
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

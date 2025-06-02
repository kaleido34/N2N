"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Transcript {
  id: string;
  title: string;
  date: string;
  content: string;
}

interface TranscriptSegment {
  text: string;
  startTime?: number;
  endTime?: number;
}

interface TranscriptData {
  transcript: TranscriptSegment[] | string;
  source_type?: 'youtube' | 'document' | 'audio' | 'image';
  youtube_id?: string;
}

interface TranscriptsDialogProps {
  transcriptData: TranscriptData | any;
  transcriptLoading: boolean;
  contentId?: string;
  youtubeId?: string;
}

export function TranscriptsDialog({ transcriptData, transcriptLoading, contentId, youtubeId }: TranscriptsDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Debug what format we're receiving
  console.log("Transcript data format received:", transcriptData);

  // Sample transcript data - use as fallback if real data isn't available
  const sampleTranscript = {
    content: `Sample transcript content...`
  };

  // Normalize transcript data to a standard format
  const normalizeTranscript = (): TranscriptSegment[] => {
    if (!transcriptData) return [{ text: sampleTranscript.content }];
    
    // If data has transcript property and it's an array, use that
    if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
      return transcriptData.transcript.map((segment: any) => ({
        text: segment.text || '',
        startTime: segment.startTime !== undefined ? segment.startTime : undefined,
        endTime: segment.endTime !== undefined ? segment.endTime : undefined
      }));
    }
    
    // If data.transcript is a string
    if (transcriptData.transcript && typeof transcriptData.transcript === 'string') {
      return [{ text: transcriptData.transcript }];
    }
    
    // If data itself is an array (direct transcript segments)
    if (Array.isArray(transcriptData)) {
      return transcriptData.map((segment: any) => ({
        text: segment.text || '',
        startTime: segment.startTime !== undefined ? segment.startTime : undefined,
        endTime: segment.endTime !== undefined ? segment.endTime : undefined
      }));
    }
    
    // If data.data exists (API response wrapper)
    if (transcriptData.data) {
      if (transcriptData.data.transcript) {
        return normalizeTranscript.call({ transcriptData: transcriptData.data });
      }
    }
    
    // Handle string content directly
    if (typeof transcriptData === 'string') {
      return [{ text: transcriptData }];
    }
    
    // Handle legacy format with content property
    if (transcriptData.content) {
      return [{ text: transcriptData.content }];
    }
    
    // Last resort
    return [{ text: "No transcript content available" }];
  };
  
  // Get normalized transcript segments
  const transcriptSegments = normalizeTranscript();
  
  // Check if we have timestamps to display
  const hasTimestamps = transcriptSegments.some(segment => 
    segment.startTime !== undefined || segment.endTime !== undefined
  );
  
  // Get source type for context-specific UI
  const sourceType = transcriptData?.source_type || 
    (transcriptData?.data?.source_type || 'unknown');
  
  // Format timestamp (if available)
  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Extract plain text for copy functionality
  const getPlainText = () => {
    return transcriptSegments.map(segment => segment.text).join('\n');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          </div>
          Transcripts
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[850px] w-[90vw] max-h-[80vh] p-0 overflow-hidden bg-[#FAF7F8] dark:bg-gray-900">
        {transcriptLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-3 p-3 border-b">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <line x1="9" y1="10" x2="15" y2="10"></line>
                  <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
              </div>
              <DialogTitle className="text-lg font-semibold text-[#5B4B8A]">Transcript</DialogTitle>
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <div className="flex justify-between items-center p-2 border-b">
                <div className="text-sm text-gray-500">
                  {sourceType !== 'unknown' && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md capitalize">
                      {sourceType} source
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(getPlainText());
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Copy text
                </button>
              </div>
              
              <pre className="whitespace-pre-wrap text-sm font-normal text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-[500px]">
                {hasTimestamps ? (
                  transcriptSegments.map((segment, index) => (
                    <div key={index} className="mb-2">
                      {segment.startTime !== undefined && (
                        <span className="text-xs text-gray-500 mr-2 inline-block w-16">
                          [{formatTime(segment.startTime)}]
                        </span>
                      )}
                      <span>{segment.text}</span>
                    </div>
                  ))
                ) : (
                  getPlainText()
                )}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
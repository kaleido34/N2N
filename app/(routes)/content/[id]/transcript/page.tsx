"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

export default function TranscriptPage() {
  const router = useRouter();
  const { id } = useParams();
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/contents?id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch transcript");
        const data = await res.json();
        setTranscript(data.transcript);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transcript");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscript();
  }, [id]);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-background">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{color: '#5B4B8A'}}>Transcript</h1>
          <Button
            variant="ghost"
            className="text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10"
            onClick={() => router.push(`/content/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4B8A]"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            {error}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              {transcript.map((segment, idx) => (
                <div
                  key={idx}
                  className="flex space-x-4 p-4 hover:bg-muted/50 rounded-lg items-start"
                >
                  <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">
                    {formatTime(segment.offset)}
                  </span>
                  <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
} 
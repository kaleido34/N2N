"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth-provider";
import LeftPanel from "./LeftPanel";
import RightSidebar from "./RightSidebar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import axios from "axios";

interface SummaryResponse {
  message: string;
  data: string | any;
}

interface SummarySection {
  type: 'heading' | 'paragraph' | 'list_item';
  level?: number;
  content: string;
}

interface SummaryData {
  sections: SummarySection[];
}

interface ContentPageProps {
  id: string; // from useParams
}

interface ContentData {
  id: string;
  title: string;
  summary?: SummarySection[];
  content?: string;
  youtube_url?: string;
  youtube_id?: string;
  created_at?: string;
}

export default function ContentPage({ id }: ContentPageProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [mindmapData, setMindmapData] = useState<any>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [flashcardsData, setFlashcardsData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  
  // Loading states
  const [mindmapLoading, setMindmapLoading] = useState<boolean>(false);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState<boolean>(false);
  const [audioLoading, setAudioLoading] = useState<boolean>(false);
  const [transcriptLoading, setTranscriptLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

  // Add function to fetch summary
  const fetchSummary = async (contentId: string, forceRegenerate: boolean = false) => {
    if (!contentId || !user?.token) return;
    
    try {
      setSummaryLoading(true);
      const response = await axios.get<SummaryResponse>(
        `/api/spaces/generate/summary?content_id=${contentId}${forceRegenerate ? '&force=true' : ''}`,
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );
      
      if (response.data?.data) {
        // Parse the summary data
        let summaryData: SummarySection[] = [];
        
        try {
          // Handle string response (JSON string)
          if (typeof response.data.data === 'string') {
            const { parseAiResponse } = await import('@/lib/ai-utils');
            const parsed = parseAiResponse<SummaryData>(response.data.data);
            summaryData = parsed.sections || [];
          }
          // Handle object response (already parsed JSON)
          else if (typeof response.data.data === 'object') {
            if (Array.isArray(response.data.data)) {
              // Legacy string array format
              summaryData = response.data.data.map((item: string) => ({ type: 'paragraph' as const, content: item }));
            } else {
              // New format
              const data = response.data.data as SummaryData;
              summaryData = data.sections || [];
            }
          }
          
          setContent(prev => prev ? {
            ...prev,
            summary: summaryData
          } : null);
        } catch (parseError) {
          console.error('Error parsing summary JSON:', parseError);
          // Fallback to treating it as a string array if parsing fails
          const stringArray = Array.isArray(response.data.data) 
            ? response.data.data 
            : [String(response.data.data)];
          
          setContent(prev => prev ? {
            ...prev,
            summary: stringArray.map((item: string) => ({ type: 'paragraph' as const, content: item }))
          } : null);
        }
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch content when component mounts
  useEffect(() => {
    if (user?.token) {
      fetchContent();
    }
  }, [id, user]);

  // Fetch content from API
  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contents?id=${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      
      if (!res.ok) throw new Error('Failed to load content');
      
      const data = await res.json();
      
      // Update content first
      // Check if data.summary is in the new format or needs conversion
      let processedSummary = [];
      
      if (data.summary) {
        if (Array.isArray(data.summary)) {
          // Check if each item has a type property (new format)
          if (data.summary.length > 0 && typeof data.summary[0] === 'object' && data.summary[0] !== null && 'type' in data.summary[0]) {
            processedSummary = data.summary;
          } else {
            // Convert string array to structured format
            processedSummary = data.summary.map((item: string) => ({ 
              type: 'paragraph' as const, 
              content: item 
            }));
          }
        } else if (typeof data.summary === 'string') {
          // Try to parse if it's a JSON string
          try {
            const parsed = JSON.parse(data.summary);
            if (parsed.sections) {
              processedSummary = parsed.sections;
            } else {
              processedSummary = [{ type: 'paragraph', content: data.summary }];
            }
          } catch {
            processedSummary = [{ type: 'paragraph', content: data.summary }];
          }
        } else if (typeof data.summary === 'object') {
          // It might already be in the correct format
          processedSummary = data.summary.sections || [];
        }
      }
      
      setContent({
        ...data,
        summary: processedSummary
      });
      
      // Always try to fetch/refresh the summary in the background
      if (data.id) {
        fetchSummary(data.id, true); // Force regenerate summary to get the new JSON structure
      }
      
      // Once we have content data, fetch specific content types
      if (data.id) {
        fetchMindmap(data.youtube_id || '', data.id);
        fetchQuiz(data.youtube_id || '', data.id);
        fetchFlashcards(data.youtube_id || '', data.id);
        fetchAudio(data.youtube_id || '', data.id);
        fetchTranscript(data.youtube_id || '', data.id);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch mindmap data
  const fetchMindmap = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setMindmapLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/mindmap?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      // Check if response has data property and it's not null/undefined
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setMindmapData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching mindmap data:", error);
    } finally {
      setMindmapLoading(false);
    }
  };
  
  // Fetch quiz data
  const fetchQuiz = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setQuizLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/quiz?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setQuizData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);
    } finally {
      setQuizLoading(false);
    }
  };
  
  // Fetch flashcards data
  const fetchFlashcards = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setFlashcardsLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/flashcards?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setFlashcardsData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching flashcards data:", error);
    } finally {
      setFlashcardsLoading(false);
    }
  };
  
  // Fetch audio summary
  const fetchAudio = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setAudioLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/audio?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setAudioData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching audio data:", error);
    } finally {
      setAudioLoading(false);
    }
  };
  
  // Fetch transcript data
  const fetchTranscript = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setTranscriptLoading(true);
      const response = await axios.get(
        `/api/contents/transcript?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setTranscriptData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching transcript data:", error);
    } finally {
      setTranscriptLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!content) {
    return <div className="p-8">Content not found</div>;
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Left Panel with Summary */}
      <div className="flex-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <LeftPanel 
          id={content.id}
          title={content.title}
          summary={content.summary || []}
        />
      </div>
      
      {/* Right Sidebar */}
      <div className="border-l border-gray-200 dark:border-gray-700 h-full">
        <RightSidebar 
          contentId={content.id}
          youtubeId={content.youtube_id}
          mindmapData={mindmapData}
          mindmapLoading={mindmapLoading}
          quizData={quizData}
          quizLoading={quizLoading}
          flashcardsData={flashcardsData}
          flashcardsLoading={flashcardsLoading}
          audioData={audioData}
          audioLoading={audioLoading}
          transcriptData={transcriptData}
          transcriptLoading={transcriptLoading}
        />
      </div>
    </div>
  );
}

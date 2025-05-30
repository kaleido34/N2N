"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth-provider";
import LeftPanel from "./LeftPanel";
import RightSidebar from "./RightSidebar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import axios from "axios";

interface ContentPageProps {
  id: string; // from useParams
}

interface ContentData {
  id: string;
  title: string;
  summary: string[];
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
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to load content');
      }
      
      const data = await res.json();
      // Ensure summary is an array
      if (data.summary && !Array.isArray(data.summary)) {
        data.summary = [data.summary];
      }
      setContent(data);
      
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
      {/* Main Content */}
      <div className="flex-1">
        <main className="py-5 px-6 md:px-8 max-w-7xl pr-0">
          {content && (
            <>
              <LeftPanel 
                id={content.id}
                title={content.title}
                summary={content.summary || []}
              />
            </>
          )}
        </main>
      </div>
      
      {/* Right Sidebar with props */}
      <div className="hidden lg:block">
        <RightSidebar 
          contentId={content?.id}
          youtubeId={content?.youtube_id}
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

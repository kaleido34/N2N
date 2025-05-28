"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import QuizTab from "./QuizTab";
import FlashcardsTab from "./FlashcardsTab";
import MindMapTab from "./MindMapTab";

// Import dummy data for fallbacks
import {
  dummyFlashcards,
  dummySummary,
  dummyTakeaways,
  dummyQuiz,
  dummyMindMap,
} from "./dummyData";

interface ContentPageProps {
  id: string; // from useParams
}

interface LeftPanelProps {
  id: string;
  activeVideoTab: string;
  setActiveVideoTab: (value: string) => void;
}

interface RightPanelProps {
  activeMainTab: string;
  setActiveMainTab: (value: string) => void;
  
  // Quiz
  dummyQuiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  selectedAnswers: Record<number, number>;
  handleAnswerSelect: (qIndex: number, oIndex: number) => void;

  // Flashcards
  dummyFlashcards: { front: string; back: string }[];
  currentFlashcard: number;
  setCurrentFlashcard: (val: number) => void;
  isFlipped: boolean;
  setIsFlipped: (val: boolean) => void;

  // Summary
  dummySummary: string[];
  dummyTakeaways: string[];

  // Mindmap
  dummyMindMap: {
    nodes: Array<{
      key: number;
      text: string;
      category: 'root' | 'section' | 'topic';
    }>;
    links: Array<{
      from: number;
      to: number;
    }>;
  };
}

interface QuizTabProps {
  value: string;
  activeMainTab: string;
  quizData: any;
  quizLoading: boolean;
}

interface MindMapTabProps {
  value: string;
  activeMainTab: string;
  mindmapData: {
    nodes: Array<{
      key: number;
      text: string;
      category: string;
    }>;
    links: Array<{
      from: number;
      to: number;
    }>;
  };
  mindmapLoading: boolean;
}

interface FlashcardsTabProps {
  value: string;
  activeMainTab: string;
  flashcardsData: any;
  flashcardsLoading: boolean;
}

export default function ContentPage({ id }: ContentPageProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [activeVideoTab, setActiveVideoTab] = useState('transcript');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dummyQuiz, setDummyQuiz] = useState<RightPanelProps['dummyQuiz']>([]);
  const [dummyFlashcards, setDummyFlashcards] = useState<RightPanelProps['dummyFlashcards']>([]);
  const [dummySummary, setDummySummary] = useState<RightPanelProps['dummySummary']>([]);
  const [dummyTakeaways, setDummyTakeaways] = useState<RightPanelProps['dummyTakeaways']>([]);
  const [dummyMindMap, setDummyMindMap] = useState<{
    nodes: Array<{
      key: number;
      text: string;
      category: string;
    }>;
    links: Array<{
      from: number;
      to: number;
    }>;
  }>({
    nodes: [],
    links: []
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");

  const handleAudioPlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (user && user.token) {
      fetchContent();
      fetchMindmap();
      fetchSummary();
    }
  }, [id, user]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      console.log(`Fetching content for ID: ${id}`);
      const res = await fetch(`/api/contents?id=${id}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch content: ${res.status} ${res.statusText}`);
        setError("Failed to load content");
        return;
      }
      
      const data = await res.json();
      console.log("Content data:", data);
      setContent(data);
      
      // Set quiz and flashcard data if available
      setDummyQuiz(data?.quiz || dummyQuiz);
      setDummyFlashcards(data?.flashcards || dummyFlashcards);
      
      // Set any takeaways if available
      setDummyTakeaways(data?.takeaways || dummyTakeaways);
      
      // Set audio URL if available
      if (data?.youtube_url) {
        setAudioUrl(data.youtube_url);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary from the dedicated summary endpoint
  const fetchSummary = async () => {
    try {
      if (!content?.youtube_id) return;
      
      console.log(`Fetching summary for content ID: ${id} and YouTube ID: ${content.youtube_id}`);
      const res = await fetch(`/api/spaces/generate/summary?video_id=${content.youtube_id}&content_id=${id}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch summary: ${res.status} ${res.statusText}`);
        // Fall back to default summary
        setDummySummary([
          "This lesson covers important concepts related to the topic.",
          "Key points are discussed in detail with practical examples.",
          "The content is designed to help you understand the subject better."
        ]);
        return;
      }
      
      const response = await res.json();
      console.log('Summary API response:', response);
      
      if (response.data) {
        const summaryText = response.data;
        // Split summary into paragraphs for better readability
        const summaryParagraphs = typeof summaryText === 'string' 
          ? summaryText.split(/\n+/).filter(paragraph => paragraph.trim().length > 0)
          : [];
        
        setDummySummary(summaryParagraphs.length > 0 ? summaryParagraphs : [
          "This lesson covers important concepts related to the topic.",
          "Key points are discussed in detail with practical examples.",
          "The content is designed to help you understand the subject better."
        ]);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setDummySummary([
        "This lesson covers important concepts related to the topic.",
        "Key points are discussed in detail with practical examples.",
        "The content is designed to help you understand the subject better."
      ]);
    }
  };

  const fetchMindmap = async () => {
    try {
      console.log(`Fetching mindmap for content ID: ${id}`);
      const res = await fetch(`/api/spaces/generate/mindmap?content_id=${id}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch mindmap: ${res.status} ${res.statusText}`);
        
        // Use fallback mindmap data
        setDummyMindMap(dummyMindMap);
        return;
      }
      
      try {
        const response = await res.json();
        console.log('Mindmap API response:', response);
        const mindmapData = response.data;
        
        // Check if mindmapData has the correct structure
        if (!mindmapData) {
          throw new Error('No mindmap data found in the response');
        }
        
        // Format the mindmap data to match the expected structure
        const formattedMindmap = {
          nodes: [],
          links: []
        };

        // Add root node
        if (mindmapData?.nodes?.[0]) {
          formattedMindmap.nodes.push({
            key: 1,
            text: mindmapData.nodes[0].text,
            category: "root"
          });
          
          // Add children nodes and links
          let currentKey = 2;
          mindmapData.nodes[0].children?.forEach((child) => {
            formattedMindmap.nodes.push({
              key: currentKey,
              text: child.text,
              category: "section"
            });
            formattedMindmap.links.push({
              from: 1,
              to: currentKey
            });
            
            // Add grandchildren nodes and links
            const childKey = currentKey;
            if (child.children && Array.isArray(child.children)) {
              child.children.forEach((grandchild) => {
                currentKey++;
                formattedMindmap.nodes.push({
                  key: currentKey,
                  text: grandchild.text,
                  category: "topic"
                });
                formattedMindmap.links.push({
                  from: childKey,
                  to: currentKey
                });
              });
            }
            currentKey++;
          });
        }

        console.log("Formatted mindmap:", formattedMindmap);
        setDummyMindMap(formattedMindmap);
      } catch (parseError) {
        console.error('Error processing mindmap data:', parseError);
        
        // Use fallback mindmap data
        setDummyMindMap(dummyMindMap);
      }
    } catch (err) {
      console.error('Error fetching mindmap:', err);
      setDummyMindMap(dummyMindMap);
    }
  };

  const handleAnswerSelect = (qIndex: number, oIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: oIndex
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const renderTab = (value: string) => {
    switch (value) {
      case 'quiz':
        return <QuizTab
          value="quiz"
          activeMainTab={activeTab}
          quizData={dummyQuiz}
          quizLoading={loading}
        />;
      case 'flashcards':
        return <FlashcardsTab
          value="flashcards"
          activeMainTab={activeTab}
          flashcardsData={dummyFlashcards}
          flashcardsLoading={loading}
        />;
      case 'mindmap':
        return <MindMapTab
          value="mindmap"
          activeMainTab={activeTab}
          mindmapData={dummyMindMap}
          mindmapLoading={loading}
        />;
      default:
        return <div>Select a tab</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E58C5A]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4 bg-[#E58C5A] hover:bg-[#e5a05a] text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!content) {
    return <div>Content not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex items-center gap-2 text-foreground dark:text-white hover:text-foreground/80 dark:hover:text-white/80">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Content Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{color: '#5B4B8A'}}>
            {content.title || 'Untitled Content'}
          </h1>
          <p className="text-sm text-gray-500">
            {content.createdAt
              ? new Date(content.createdAt).toLocaleDateString()
              : ""}
          </p>
        </div>

        {/* Content Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-4">
            <div className="flex gap-4 mb-4">
              <Button
                variant={activeTab === 'summary' ? 'default' : 'outline'}
                onClick={() => handleTabChange('summary')}
              >
                Summary
              </Button>
              <Button
                variant={activeTab === 'quiz' ? 'default' : 'outline'}
                onClick={() => handleTabChange('quiz')}
              >
                Quiz
              </Button>
              <Button
                variant={activeTab === 'flashcards' ? 'default' : 'outline'}
                onClick={() => handleTabChange('flashcards')}
              >
                Flashcards
              </Button>
              <Button
                variant={activeTab === 'mindmap' ? 'default' : 'outline'}
                onClick={() => handleTabChange('mindmap')}
              >
                Mindmap
              </Button>
            </div>
            <div className="p-6">
              {activeTab === 'summary' ? (
                <div className="flex gap-4">
                  <LeftPanel 
                    id={id}
                    activeVideoTab={activeVideoTab}
                    setActiveVideoTab={setActiveVideoTab}
                  />
                  <RightPanel 
                    activeMainTab={activeTab}
                    setActiveMainTab={setActiveTab}
                    dummyQuiz={dummyQuiz}
                    selectedAnswers={selectedAnswers}
                    handleAnswerSelect={handleAnswerSelect}
                    dummyFlashcards={dummyFlashcards}
                    currentFlashcard={currentFlashcard}
                    setCurrentFlashcard={setCurrentFlashcard}
                    isFlipped={isFlipped}
                    setIsFlipped={setIsFlipped}
                    dummySummary={dummySummary}
                    dummyTakeaways={dummyTakeaways}
                    dummyMindMap={dummyMindMap}
                  />
                </div>
              ) : (
                renderTab(activeTab)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

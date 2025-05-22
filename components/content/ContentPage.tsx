"use client";

import { useState, useEffect, useRef } from "react";
import useIsMobile from "@/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/hooks/auth-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";

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

/**
 * (Optional) If you moved dummy data to "dummyData.ts",
 * import it here. Otherwise, keep them in this file as you originally had.
 */
import {
  dummyChatMessages,
  dummyFlashcards,
  dummySummary,
  dummyTakeaways,
  dummyQuiz,
  dummyMindMap,
} from "./dummyData";

interface ContentPageProps {
  id: string; // from useParams
}

export default function ContentPage({ id }: ContentPageProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { user } = useAuth();

  const [activeMainTab, setActiveMainTab] = useState("chat");
  const [activeVideoTab, setActiveVideoTab] = useState("transcript");
  const [chatInput, setChatInput] = useState("");
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [summary, setSummary] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [youtube_id, setYoutubeId] = useState<string>("");
  const [content_id, setContentId] = useState<string>("");
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const [contentType, setContentType] = useState<"YOUTUBE_CONTENT" | "DOCUMENT_CONTENT" | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState<any>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [mindmapData, setMindmapData] = useState<any>(null);
  const [mindmapLoading, setMindmapLoading] = useState(false);

  // Fetch content metadata and type
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/contents?id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch content details");
        const data = await res.json();
        setContentType(data.type);
        setContentId(id);
        if (data.type === "YOUTUBE_CONTENT") {
          setYoutubeId(data.youtube_id);
        } else if (data.type === "DOCUMENT_CONTENT") {
          setDocumentText(data.text || "");
        }
      } catch (e) {
        setYoutubeId("");
        setContentId("");
        setContentType(null);
        setDocumentText("");
      }
    };
    fetchContent();
  }, [id]);

  // Fetch all AI features when content is loaded
  useEffect(() => {
    if (!contentType) return;
    if (contentType === 'YOUTUBE_CONTENT' && youtube_id) {
      // Video lesson: fetch by video_id
      setQuizLoading(true);
      setFlashcardsLoading(true);
      setMindmapLoading(true);
      fetch(`/api/quiz?video_id=${youtube_id}`)
        .then(res => res.json())
        .then(data => setQuizData(data))
        .finally(() => setQuizLoading(false));
      fetch(`/api/flashcards?video_id=${youtube_id}`)
        .then(res => res.json())
        .then(data => setFlashcardsData(data))
        .finally(() => setFlashcardsLoading(false));
      fetch(`/api/mindmap?video_id=${youtube_id}`)
        .then(res => res.json())
        .then(data => setMindmapData(data))
        .finally(() => setMindmapLoading(false));
    } else if (contentType === 'DOCUMENT_CONTENT' && documentText) {
      // Document lesson: fetch by POSTing text
      setQuizLoading(true);
      setFlashcardsLoading(true);
      setMindmapLoading(true);
      fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText })
      })
        .then(res => res.json())
        .then(data => setQuizData(data))
        .finally(() => setQuizLoading(false));
      fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText })
      })
        .then(res => res.json())
        .then(data => setFlashcardsData(data))
        .finally(() => setFlashcardsLoading(false));
      fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText })
      })
        .then(res => res.json())
        .then(data => setMindmapData(data))
        .finally(() => setMindmapLoading(false));
    }
  }, [contentType, youtube_id, documentText]);

  // Fetch summary (and use correct text source)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        if (!content_id || !user?.token) return;
        if (contentType === "DOCUMENT_CONTENT" && documentText) {
          // Document: POST with text
          const response: any = await axios.post(
            `/api/spaces/generate/summary`,
            { text: documentText, content_id },
            { headers: { authorization: user?.token } }
          );
          if (response.data && response.data.data) {
            const summaryData = response.data.data;
            setSummary(Array.isArray(summaryData) ? summaryData : summaryData.split('\n').filter(Boolean));
          }
        } else if (contentType === "YOUTUBE_CONTENT" && youtube_id) {
          // Video: GET with video_id and content_id
          const response: any = await axios.get(
            `/api/spaces/generate/summary?video_id=${youtube_id}&content_id=${content_id}`,
            { headers: { authorization: user?.token } }
          );
          if (response.data && response.data.data) {
            const summaryData = response.data.data;
            setSummary(Array.isArray(summaryData) ? summaryData : summaryData.split('\n').filter(Boolean));
          }
        }
      } catch (error) {
        setSummary(["Failed to load summary."]);
        console.error('Error fetching summary:', error);
      }
    };
    if ((contentType === "DOCUMENT_CONTENT" && documentText) || (contentType === "YOUTUBE_CONTENT" && youtube_id && content_id && user?.token)) {
      fetchSummary();
    }
  }, [contentType, documentText, youtube_id, content_id, user?.token]);

  // Chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const response: any = await axios.post(
        `/api/spaces/generate/chat`,
        contentType === "DOCUMENT_CONTENT"
          ? { data: { text: documentText, content_id }, messages: newMessages }
          : { data: { video_id: youtube_id }, messages: newMessages },
        {
          headers: { Authorization: user?.token ? `Bearer ${user.token}` : "" },
        }
      );
      if (response.data && response.data.data) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.data }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response from assistant.' }]);
      console.error('Error sending message:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const chunkText = (text: string, chunkSize: number = 200) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + chunkSize));
      i += chunkSize;
    }
    return chunks;
  };

  const getFirstNWordsFullSentence = (text: string, n: number = 100): string => {
    const words = text.split(/\s+/);
    if (words.length <= n) return text;
    const firstN = words.slice(0, n).join(' ');
    // Find the last sentence-ending punctuation in the first N words
    const match = firstN.match(/([\s\S]*?[.!?])(?=[^.!?]*$)/);
    if (match) {
      return match[0];
    }
    return firstN;
  };

  const handleListenAudio = async () => {
    setAudioLoading(true);
    setAudioError(null);
    setAudioUrls([]);
    setCurrentAudioIndex(0);
    try {
      const text = summary.join(' ');
      const trimmedText = getFirstNWordsFullSentence(text, 100);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText }),
      });
      if (!res.ok) throw new Error('Failed to generate audio');
      const blob = await res.blob();
      setAudioUrls([URL.createObjectURL(blob)]);
    } catch (e: any) {
      setAudioError(e.message || 'Audio generation failed');
    } finally {
      setAudioLoading(false);
    }
  };

  const handleAudioEnded = () => {
    if (currentAudioIndex < audioUrls.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1);
      audioRefs.current[currentAudioIndex + 1]?.play();
    }
  };

  return (
    <div className="flex flex-row h-full min-h-screen bg-background">
      {/* Left Section */}
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col items-center px-6 py-10 gap-6 border-r border-gray-200 dark:border-gray-800">
        <LeftPanel id={id} activeVideoTab={activeVideoTab} setActiveVideoTab={setActiveVideoTab} />
      </div>
      {/* Right Section */}
      <div className="flex-1 flex flex-col px-8 py-10 gap-8 overflow-y-auto">
        {/* Top bar with title and back button */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight" style={{color: '#5B4B8A'}}>
            Overview
          </h1>
          <Button
            variant="ghost"
            className="text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10"
            onClick={() => router.push('/dashboard/spaces/99d8053b-3aaa-41b5-9475-aa7b5af10dcd')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        {/* Overview Section */}
        <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow mb-8">
          {summary.length > 0 ? summary.map((para, idx) => (
            <p key={idx} className="mb-3 text-gray-800 dark:text-gray-200 text-base leading-relaxed">{para}</p>
          )) : <span className="text-gray-400">No summary available.</span>}
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={handleListenAudio} disabled={audioLoading || summary.length === 0} className="w-fit">
              {audioLoading ? 'Generating Audio...' : 'Listen Audio'}
            </Button>
            {audioError && <span className="text-red-500 text-sm">{audioError}</span>}
            {audioUrls.length > 0 && (
              <div className="flex flex-col gap-1">
                {audioUrls.map((url, idx) => (
                  <audio
                    key={idx}
                    ref={el => { audioRefs.current[idx] = el; }}
                    src={url}
                    controls={idx === currentAudioIndex}
                    autoPlay={idx === currentAudioIndex}
                    onEnded={handleAudioEnded}
                    style={{ display: idx === currentAudioIndex ? 'block' : 'none' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Chat Section */}
        <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow mb-8 flex flex-col" style={{ maxWidth: 800 }}>
          <h3 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>Chat</h3>
          <div className="flex-1 overflow-y-auto mb-4 max-h-64">
            {chatMessages.length > 0 ? chatMessages.map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-[#E8E3FF] text-[#5B4B8A]' : 'bg-[#F3F0FF] text-[#232323]'}`}>{msg.content}</span>
              </div>
            )) : <span className="text-gray-400">No chat messages yet.</span>}
            {isChatLoading && <div className="text-[#5B4B8A]">Assistant is typing...</div>}
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-2 mt-auto">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B4B8A]"
              placeholder="Type your message..."
              disabled={isChatLoading}
            />
            <button type="submit" className="bg-[#5B4B8A] text-white px-4 py-2 rounded-lg font-semibold" disabled={isChatLoading}>Send</button>
          </form>
        </div>
        <Tabs defaultValue="summary" className="flex flex-col flex-1 min-h-0">
          <TabsContent value="quiz">
            <QuizTab
              value="quiz"
              activeMainTab={activeMainTab}
              quizData={quizData}
              quizLoading={quizLoading}
            />
          </TabsContent>
          <TabsContent value="flashcards">
            <FlashcardsTab
              value="flashcards"
              activeMainTab={activeMainTab}
              flashcardsData={flashcardsData}
              flashcardsLoading={flashcardsLoading}
            />
          </TabsContent>
          <TabsContent value="mindmap">
            <MindMapTab
              value="mindmap"
              activeMainTab={activeMainTab}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

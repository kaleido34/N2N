"use client";

import { useState, useEffect } from "react";
import useIsMobile from "@/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/hooks/auth-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";

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

  // Fetch youtube_id/content_id on mount
  useEffect(() => {
    const fetchIds = async () => {
      try {
        const res = await fetch(`/api/contents?id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch video details");
        const data = await res.json();
        setYoutubeId(data.youtube_id);
        setContentId(id);
      } catch (e) {
        setYoutubeId("");
        setContentId("");
      }
    };
    fetchIds();
  }, [id]);

  // Fetch summary
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response: any = await axios.get(
          `/api/spaces/generate/summary?video_id=${youtube_id}&content_id=${content_id}`,
          { headers: { authorization: user?.token } }
        );
        if (response.data && response.data.data) {
          const summaryData = response.data.data;
          setSummary(Array.isArray(summaryData) ? summaryData : summaryData.split('\n').filter(Boolean));
        }
      } catch (error) {
        setSummary(["Failed to load summary."]);
        console.error('Error fetching summary:', error);
      }
    };
    if (youtube_id && content_id && user?.token) fetchSummary();
  }, [youtube_id, content_id, user?.token]);

  // Chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response: any = await axios.post(
        `/api/spaces/generate/chat`,
        { video_id: youtube_id, content_id: content_id, message: chatInput },
        { headers: { authorization: user?.token } }
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
      </div>
    </div>
  );
}

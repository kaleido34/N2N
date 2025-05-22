"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatTab from "./ChatTab";
import QuizTab from "./QuizTab";
import FlashcardsTab from "./FlashcardsTab";
import SummaryTab from "./SummaryTab";

import {
  MessageSquare,
  Lightbulb,
  Layers,
  FileText,
} from "lucide-react";

interface RightPanelProps {
  activeMainTab: string;
  setActiveMainTab: (value: string) => void;

  // Chat
  chatInput: string;
  setChatInput: (value: string) => void;
  handleChatSubmit: (e: React.FormEvent) => void;
  dummyChatMessages: { role: string; content: string }[];

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
}

export default function RightPanel({
  activeMainTab,
  setActiveMainTab,
  chatInput,
  setChatInput,
  handleChatSubmit,
  dummyChatMessages,
  dummySummary,
  dummyTakeaways,
}: RightPanelProps) {
  return (
    <div className="h-full w-full p-4 flex flex-col min-h-0">
      <h2 className="text-3xl font-bold mb-4" style={{color: '#5B4B8A'}}>Overview</h2>
      <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow mb-6 min-h-[120px]">
        {/* Render summary content */}
        {dummySummary && dummySummary.length > 0 ? (
          dummySummary.map((line, idx) => (
            <p key={idx} className="text-gray-700 dark:text-gray-200 mb-2">{line}</p>
          ))
        ) : (
          <span className="text-gray-400">No summary available.</span>
        )}
      </div>
      <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow min-h-[200px] flex-1 flex flex-col">
        <h3 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>Chat</h3>
        <div className="flex-1 overflow-y-auto mb-4">
          {dummyChatMessages && dummyChatMessages.length > 0 ? (
            dummyChatMessages.map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-[#E8E3FF] text-[#5B4B8A]' : 'bg-[#F3F0FF] text-[#232323]'}`}>{msg.content}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400">No chat messages yet.</span>
          )}
        </div>
        <form onSubmit={handleChatSubmit} className="flex gap-2 mt-auto">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B4B8A]"
            placeholder="Type your message..."
          />
          <button type="submit" className="bg-[#5B4B8A] text-white px-4 py-2 rounded-lg font-semibold">Send</button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizTab from "./QuizTab";
import FlashcardsTab from "./FlashcardsTab";
import SummaryTab from "./SummaryTab";

import {
  Lightbulb,
  Layers,
  FileText,
} from "lucide-react";

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
  dummyMindMap: any;
}

export default function RightPanel({
  activeMainTab,
  setActiveMainTab,
  dummyQuiz,
  selectedAnswers,
  handleAnswerSelect,
  dummyFlashcards,
  currentFlashcard,
  setCurrentFlashcard,
  isFlipped,
  setIsFlipped,
  dummySummary,
  dummyTakeaways,
  dummyMindMap,
}: RightPanelProps) {
  return (
    <div className="h-full w-full p-4 flex flex-col min-h-0">
      <h2 className="text-3xl font-bold mb-4" style={{color: '#5B4B8A'}}>Overview</h2>
      <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow mb-6 min-h-[120px]">
        {/* Render summary content */}
        {dummySummary && dummySummary.length > 0 ? (
          <div>
            {dummySummary.map((line, idx) => (
              <p key={idx} className="text-gray-700 dark:text-gray-200 mb-2">{line}</p>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">No summary available.</span>
        )}
        
        {/* Audio controls */}
        <div className="mt-4 flex flex-col space-y-2">
          <button 
            onClick={async () => {
              const audioElement = document.getElementById('audio-player') as HTMLAudioElement;
              if (audioElement) {
                if (audioElement.paused) {
                  // Generate audio if not already loaded
                  if (!audioElement.src || audioElement.src === window.location.href) {
                    try {
                      const summaryText = dummySummary.join(' ');
                      const response = await fetch('/api/tts', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ text: summaryText })
                      });
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        audioElement.src = url;
                        audioElement.play();
                      } else {
                        console.error('Failed to get audio:', response.status);
                      }
                    } catch (error) {
                      console.error('Error fetching audio:', error);
                    }
                  } else {
                    audioElement.play();
                  }
                } else {
                  audioElement.pause();
                }
              }
            }}
            className="bg-[#5B4B8A] text-white px-4 py-2 rounded-lg hover:bg-[#7B5EA7] w-fit"
          >
            Listen to Audio
          </button>
          <audio 
            id="audio-player" 
            controls 
            className="w-full mt-2"
          />
        </div>
      </div>
      <div className="bg-white dark:bg-[#18132A] rounded-xl p-6 shadow min-h-[200px] flex-1 flex flex-col">
        <h3 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>Notes</h3>
        <div className="flex-1 overflow-y-auto mb-4">
          <textarea
            className="w-full h-full min-h-[150px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B4B8A] bg-white dark:bg-[#1E1A2E] text-[#232323] dark:text-white"
            placeholder="Take notes here..."
          ></textarea>
        </div>
      </div>
    </div>
  );
}

"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, ChevronRight } from "lucide-react";
import { useSpaces } from "@/hooks/space-provider";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/auth-provider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Flashcard {
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  source: string;
}

interface FlashcardsTabProps {
  value: string;
  activeMainTab: string;
  flashcardsData: any;
  flashcardsLoading: boolean;
}

export default function FlashcardsTab({
  value,
  activeMainTab,
  flashcardsData,
  flashcardsLoading,
}: FlashcardsTabProps) {
  // Remove all fetching logic and local flashcards state
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const resetCard = () => {
    setShowHint(false);
    setShowAnswer(false);
    setShowExplanation(false);
  };

  const nextCard = () => {
    resetCard();
    setCurrentFlashcard((prev) => (prev + 1) % (flashcardsData?.flashcards?.length || 1));
  };

  const handleFlip = (index: number) => {
    setFlipped(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <TabsContent value={value} className="flex-1 min-h-0 overflow-hidden mt-4">
      {activeMainTab === value && (
        <Card className="h-full flex flex-col min-h-0">
          <ScrollArea className="p-6 flex-1">
            {flashcardsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {flashcardsData && flashcardsData.flashcards && flashcardsData.flashcards.map((card: any, index: number) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer h-40 perspective`}
                    onClick={() => handleFlip(index)}
                  >
                    <div
                      className={`transition-transform duration-500 transform ${flipped[index] ? "rotate-y-180" : ""} h-full w-full`}
                    >
                      <div className={`absolute w-full h-full backface-hidden flex items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700`}
                      >
                        <span className="text-lg font-medium text-center">{card.front}</span>
                      </div>
                      <div className={`absolute w-full h-full backface-hidden flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 rotate-y-180`}
                      >
                        <span className="text-lg text-center">{card.back}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </TabsContent>
  );
}

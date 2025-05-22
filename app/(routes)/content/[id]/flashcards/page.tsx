"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import styles from "./flashcards.module.css";
import { useAuth } from "@/hooks/auth-provider";

interface Flashcard {
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  source: string;
}

interface FlashcardData {
  flashcards: Flashcard[];
}

export default function FlashcardsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const [flashcardData, setFlashcardData] = useState<FlashcardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Step 1: Fetch youtube_id and content_id
        const contentRes = await fetch(`/api/contents?id=${id}`);
        if (!contentRes.ok) throw new Error("Failed to fetch content info");
        const contentData = await contentRes.json();
        const youtube_id = contentData.youtube_id;
        const content_id = id;
        // Step 2: Fetch flashcards data with Authorization header
        const flashRes = await fetch(`/api/spaces/generate/flashcard?video_id=${youtube_id}&content_id=${content_id}`, {
          headers: {
            Authorization: user?.token || "",
          },
        });
        if (!flashRes.ok) throw new Error("Failed to fetch flashcards");
        const flashData = await flashRes.json();
        setFlashcardData(flashData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flashcards");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.token) {
      fetchFlashcards();
    }
  }, [id, user?.token]);

  const handleNext = () => {
    if (currentCard < (flashcardData?.flashcards.length || 0) - 1) {
      setCurrentCard(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReset = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-background">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{color: '#5B4B8A'}}>Flashcards</h1>
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
        ) : flashcardData ? (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                Card {currentCard + 1} of {flashcardData.flashcards.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-[#7B5EA7] dark:text-[#C7AFFF]"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Flashcard */}
            <div className={`relative aspect-[4/3] ${styles["perspective-1000"]}`}>
              <Card
                className={`w-full h-full transition-transform duration-500 ${styles["transform-style-3d"]} cursor-pointer ${
                  isFlipped ? styles["rotate-y-180"] : ""
                }`}
                onClick={handleFlip}
              >
                {/* Front of card */}
                <div className={`absolute w-full h-full ${styles["backface-hidden"]} p-6 flex flex-col ${
                  isFlipped ? "hidden" : "block"
                }`}>
                  <h2 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>
                    {flashcardData.flashcards[currentCard].question}
                  </h2>
                  {showHint && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50">
                      <p className="text-sm">
                        <span className="font-medium">Hint:</span>{" "}
                        {flashcardData.flashcards[currentCard].hint}
                      </p>
                    </div>
                  )}
                  {!showHint && (
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(true);
                      }}
                      className="mt-auto"
                    >
                      Show Hint
                    </Button>
                  )}
                </div>

                {/* Back of card */}
                <div className={`absolute w-full h-full ${styles["backface-hidden"]} p-6 rotate-y-180 ${
                  isFlipped ? "block" : "hidden"
                }`}>
                  <h2 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>
                    Answer
                  </h2>
                  <p className="text-lg mb-4">
                    {flashcardData.flashcards[currentCard].answer}
                  </p>
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      <span className="font-medium">Explanation:</span>{" "}
                      {flashcardData.flashcards[currentCard].explanation}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Source: {flashcardData.flashcards[currentCard].source}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentCard === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentCard === flashcardData.flashcards.length - 1}
                style={{backgroundColor: '#5B4B8A'}}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 
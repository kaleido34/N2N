"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface FlashcardsDialogProps {
  flashcardsData: any;
  flashcardsLoading: boolean;
  contentId?: string;
  youtubeId?: string;
}

interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

const sampleFlashcards: Flashcard[] = [
  {
    id: 1,
    question: "What is GitHub Copilot?",
    answer: "GitHub Copilot is an AI-powered code completion tool developed by GitHub and OpenAI that helps developers write code faster by suggesting code snippets based on the context."
  },
  {
    id: 2,
    question: "When was GitHub Copilot released?",
    answer: "GitHub Copilot was released as a technical preview in June 2021 and became generally available in June 2022."
  },
  {
    id: 3,
    question: "What technology powers GitHub Copilot?",
    answer: "GitHub Copilot is powered by OpenAI Codex, a machine learning model trained on billions of lines of public code."
  },
  // Add more flashcards as needed
];

export function FlashcardsDialog({ flashcardsData, flashcardsLoading, contentId, youtubeId }: FlashcardsDialogProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Debug what format we're receiving
  console.log("Flashcards data format received:", flashcardsData);
  
  // Handle various possible flashcards data structures
  let flashcards: Flashcard[] = [];
  if (flashcardsData) {
    if (flashcardsData.flashcards && Array.isArray(flashcardsData.flashcards)) {
      // Standard format from our API
      flashcards = flashcardsData.flashcards;
    } else if (Array.isArray(flashcardsData)) {
      // Direct array format
      flashcards = flashcardsData;
    } else if (typeof flashcardsData === 'object' && flashcardsData !== null) {
      // Try to extract any array property that might contain flashcards
      const possibleArrayProps = Object.values(flashcardsData).filter(val => Array.isArray(val));
      if (possibleArrayProps.length > 0) {
        flashcards = possibleArrayProps[0];
      }
    }
  }
  
  console.log("Processed flashcards:", flashcards);
  
  // After all parsing attempts, if flashcards array is empty, use sample flashcards as fallback
  if (flashcards.length === 0) {
    console.log('No valid flashcards found, using sample data');
    flashcards = sampleFlashcards;
  }
  
  const currentCard = flashcards[currentCardIndex] || sampleFlashcards[0];
  const totalCards = flashcards.length;

  const handleNext = () => {
    if (currentCardIndex < totalCards - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex(prevIndex => prevIndex + 1);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex(prevIndex => prevIndex - 1);
      }, 200);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          View Flashcards
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-[#FAF7F8] dark:bg-gray-900">
        {flashcardsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
          </div>
        ) : !flashcards || flashcards.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p>No flashcards available.</p>
          </div>
        ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 p-3 border-b">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
            </div>
            <DialogTitle className="text-xl font-semibold text-[#5B4B8A]">View Flashcards</DialogTitle>
          </div>
          
          <div className="px-6 py-4">
            <div 
              className="relative w-full h-[230px] mb-4 cursor-pointer perspective-1000"
              onClick={flipCard}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={isFlipped ? 'back' : 'front'}
                  initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute w-full h-full rounded-xl shadow-md p-4 flex items-center justify-center 
                    ${isFlipped 
                      ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white' 
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}
                >
                  <div className="text-center">
                    <p className={`text-xl font-medium ${isFlipped ? 'text-gray-800 dark:text-white' : 'text-white'}`}>
                      {isFlipped ? currentCard.answer : currentCard.question}
                    </p>
                    <p className="text-sm mt-4 opacity-70">
                      {isFlipped ? "Click to see question" : "Click to see answer"}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex justify-between items-center">
              <Button 
                onClick={handlePrevious}
                disabled={currentCardIndex === 0}
                variant="outline"
                className="px-4 py-2 text-[#5B4B8A] border-[#5B4B8A]"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {currentCardIndex + 1} of {totalCards}
              </span>
              <Button 
                onClick={handleNext}
                disabled={currentCardIndex === totalCards - 1}
                className="px-4 py-2 bg-[#5B4B8A] hover:bg-[#4a3d70] text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What significant action did Microsoft take regarding GitHub Copilot?",
    options: [
      "Increased its subscription price",
      "Made it exclusively available to enterprise clients",
      "Open-sourced it under the MIT license",
      "Discontinued its development"
    ],
    correctAnswer: 2
  },
  {
    id: 2,
    question: "Which technology powers GitHub Copilot?",
    options: [
      "Machine Learning",
      "Artificial Intelligence",
      "Neural Networks",
      "Deep Learning"
    ],
    correctAnswer: 1
  },
  // Add more questions as needed
];

export function QuizDialog() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const totalQuestions = sampleQuestions.length;

  const checkAnswer = () => {
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedOption(null);
      setAnswerState('unanswered');
    } else {
      setQuizCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setSelectedOption(null);
      setAnswerState('unanswered');
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setAnswerState('unanswered');
    setScore(0);
    setQuizCompleted(false);
    setAnsweredQuestions(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>
          </div>
          Take a Quiz
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-[#FAF7F8] dark:bg-gray-900">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 p-3 border-b">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
              </svg>
            </div>
            <DialogTitle className="text-xl font-semibold text-[#5B4B8A]">Take a Quiz</DialogTitle>
          </div>
          
          {!quizCompleted ? (
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium mb-4 text-[#5B4B8A]">Question {currentQuestionIndex + 1} of {totalQuestions}</h3>
              
              <div className="mb-6">
                <h4 className="text-lg font-medium text-[#5B4B8A] dark:text-white mb-4">{currentQuestion.question}</h4>
                
                <RadioGroup 
                  value={selectedOption?.toString()} 
                  onValueChange={(value) => {
                    const selectedIndex = parseInt(value);
                    setSelectedOption(selectedIndex);
                    // Check if the answer is correct and if this question has been answered before
                    if (selectedIndex === currentQuestion.correctAnswer && !answeredQuestions.has(currentQuestionIndex)) {
                      setAnswerState('correct');
                      setScore(prevScore => prevScore + 1);
                      setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
                    } else {
                      setAnswerState('incorrect');
                    }
                  }}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center space-x-2 py-1 px-2 rounded-md
                        ${selectedOption !== null && index === currentQuestion.correctAnswer ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : ''}
                        ${selectedOption !== null && index === selectedOption && index !== currentQuestion.correctAnswer ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' : ''}
                      `}
                    >
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} className="text-[#5B4B8A]" />
                      <Label htmlFor={`option-${index}`} className="text-base font-medium cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="px-4 py-2 text-[#5B4B8A] border-[#5B4B8A]"
                >
                  Previous
                </Button>
                
                <Button 
                  onClick={handleNext}
                  disabled={selectedOption === null}
                  className="px-4 py-2 bg-[#5B4B8A] hover:bg-[#4a3d70] text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 text-center">
              <h3 className="text-xl font-semibold text-[#5B4B8A] dark:text-white mb-4">Quiz Completed!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Your score: {score}/{totalQuestions}</p>
              
              <Button 
                onClick={resetQuiz}
                className="px-6 py-2 bg-[#5B4B8A] hover:bg-[#4a3d70] text-white mx-auto"
              >
                Take Quiz Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

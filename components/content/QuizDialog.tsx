"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface QuizDialogProps {
  quizData: any;
  quizLoading: boolean;
  contentId?: string;
  youtubeId?: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  timestamp?: string;
  correct_option?: string; // For backward compatibility
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

// Backup sample questions in case real data isn't available
const sampleQuestions = [
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

export function QuizDialog({ quizData, quizLoading, contentId, youtubeId }: QuizDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  // Debug what format we're receiving
  console.log("Quiz data format received:", quizData);
  
  // Handle various possible quiz data structures
  let questions: Question[] = [];
  if (quizData) {
    console.log('Processing quiz data:', quizData);
    
    const parseQuestion = (q: any, index: number): Question | null => {
      if (!q) return null;
      return {
        id: index + 1,
        question: q.question || '',
        options: q.options || [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                     (q.correct_option && q.options ? 
                       q.options.findIndex((opt: string) => opt === q.correct_option) : 
                       0),
        explanation: q.explanation || ""
      };
    };
    
    // Handle case where quizData has a 'quiz' property containing the questions
    if (quizData.quiz && Array.isArray(quizData.quiz)) {
      console.log('Found quiz data in quizData.quiz array');
      questions = quizData.quiz
        .map(parseQuestion)
        .filter((q: Question | null): q is Question => q !== null);
    }
    // Handle case where quizData has a 'questions' property containing the questions
    else if (quizData.questions && Array.isArray(quizData.questions)) {
      console.log('Found quiz data in quizData.questions array');
      questions = quizData.questions
        .map(parseQuestion)
        .filter((q: Question | null): q is Question => q !== null);
    }
    // Handle case where quizData is an array of questions directly
    else if (Array.isArray(quizData)) {
      console.log('Found quiz data as direct array');
      questions = quizData
        .map(parseQuestion)
        .filter((q: Question | null): q is Question => q !== null);
    }
    // If we have questions but they're in a different format, try to adapt
    else if (typeof quizData === 'object') {
      console.log('Trying to adapt unknown quiz data format');
      try {
        // Try to extract questions from any property that might be an array
        const possibleQuestionsArray = Object.values(quizData).find(val => Array.isArray(val));
        if (possibleQuestionsArray && Array.isArray(possibleQuestionsArray)) {
          questions = (possibleQuestionsArray as any[])
            .map(parseQuestion)
            .filter((q: Question | null): q is Question => q !== null);
        }
      } catch (e) {
        console.error('Error adapting quiz data:', e);
      }
    }
  }
  
  console.log("Processed quiz questions:", questions);
  
  // After all parsing attempts, if questions array is empty, use sample questions as fallback
  if (questions.length === 0) {
    console.log('No valid quiz questions found, using sample data');
    questions = sampleQuestions;
  }
  
  // Store user answers for each question separately
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  
  const currentQuestion = questions[currentQuestionIndex] || sampleQuestions[0];
  const totalQuestions = questions.length;
  
  // Get current question's selected option from the userAnswers array
  const selectedOption = userAnswers[currentQuestionIndex];

  // Check answer and update score if not already answered
  const checkAnswer = () => {
    const currentAnswer = userAnswers[currentQuestionIndex];
    if (currentAnswer === null) return;
    
    const isCorrect = currentAnswer === currentQuestion.correctAnswer;
    setAnswerState(isCorrect ? 'correct' : 'incorrect');
    
    // Only update score if this question hasn't been answered correctly before
    if (isCorrect && !answeredQuestions.has(currentQuestionIndex)) {
      setScore(prevScore => prevScore + 1);
      // Mark this question as correctly answered
      setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]));
    }
  };

  const handleNext = () => {
    // Check the answer before moving to the next question (if an option is selected)
    if (userAnswers[currentQuestionIndex] !== null) {
      checkAnswer();
    }
    
    if (currentQuestionIndex < totalQuestions - 1) {
      // Move to next question
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      // Reset answer state
      setAnswerState('unanswered');
    } else {
      // Complete quiz if it's the last question
      setQuizCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      // Just reset the answer state, but keep the user's previous answer
      setAnswerState('unanswered');
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(questions.length).fill(null));
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
        {quizLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
          </div>
        ) : !questions || questions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p>No quiz questions available.</p>
          </div>
        ) : (
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
                  
                  {/* Force complete re-render of the RadioGroup component for each question */}
                  <div key={`radiogroup-container-${currentQuestionIndex}`}>
                    <RadioGroup 
                      value={selectedOption === null ? undefined : selectedOption.toString()} 
                      onValueChange={(value) => {
                        const selectedIndex = parseInt(value);
                        
                        // Update the answer for this specific question in the array
                        setUserAnswers(prev => {
                          const newAnswers = [...prev];
                          newAnswers[currentQuestionIndex] = selectedIndex;
                          return newAnswers;
                        });
                        
                        // Update the UI to show if the answer is correct
                        if (selectedIndex === currentQuestion.correctAnswer) {
                          setAnswerState('correct');
                        } else {
                          setAnswerState('incorrect');
                        }
                        // Score is updated in checkAnswer when moving to next question
                      }}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option: string, index: number) => (
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
                    // Next button is always active as requested
                    className="px-4 py-2 bg-[#5B4B8A] hover:bg-[#4a3d70] text-white"
                  >
                    {currentQuestionIndex < totalQuestions - 1 ? 'Next' : 'Finish Quiz'}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/auth-provider";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_option: string;
  explanation: string;
  timestamp: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

export default function QuizPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Step 1: Fetch youtube_id and content_id
        const contentRes = await fetch(`/api/contents?id=${id}`);
        if (!contentRes.ok) throw new Error("Failed to fetch content info");
        const contentData = await contentRes.json();
        const youtube_id = contentData.youtube_id;
        const content_id = id;
        // Step 2: Fetch quiz data with Authorization header
        const quizRes = await fetch(`/api/spaces/generate/quiz?video_id=${youtube_id}&content_id=${content_id}`, {
          headers: {
            Authorization: user?.token || "",
          },
        });
        if (!quizRes.ok) throw new Error("Failed to fetch quiz");
        const quizData = await quizRes.json();
        setQuizData(quizData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.token) {
      fetchQuiz();
    }
  }, [id, user?.token]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const calculateScore = () => {
    if (!quizData) return 0;
    return quizData.questions.reduce((score, question, index) => {
      return score + (selectedAnswers[index] === question.correct_option ? 1 : 0);
    }, 0);
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const handleNext = () => {
    if (currentQuestion < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-background">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{color: '#5B4B8A'}}>Quiz</h1>
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
        ) : quizData ? (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {quizData.questions.length}
              </span>
              {showResults && (
                <span className="text-sm font-medium" style={{color: '#5B4B8A'}}>
                  Score: {calculateScore()} / {quizData.questions.length}
                </span>
              )}
            </div>

            {/* Question card */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>
                {quizData.questions[currentQuestion].question}
              </h2>
              
              <RadioGroup
                value={selectedAnswers[currentQuestion] || ""}
                onValueChange={(value: string) => handleAnswerSelect(currentQuestion, value)}
                className="space-y-3"
              >
                {quizData.questions[currentQuestion].options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`option-${index}`}
                      disabled={showResults}
                    />
                    <Label
                      htmlFor={`option-${index}`}
                      className={`flex-1 p-3 rounded-lg cursor-pointer ${
                        showResults
                          ? option === quizData.questions[currentQuestion].correct_option
                            ? "bg-green-50 dark:bg-green-900/20"
                            : selectedAnswers[currentQuestion] === option
                            ? "bg-red-50 dark:bg-red-900/20"
                            : ""
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResults && (
                          <>
                            {option === quizData.questions[currentQuestion].correct_option && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            {selectedAnswers[currentQuestion] === option &&
                              option !== quizData.questions[currentQuestion].correct_option && (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {showResults && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <span className="font-medium">Explanation:</span>{" "}
                    {quizData.questions[currentQuestion].explanation}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Timestamp: {quizData.questions[currentQuestion].timestamp}
                  </p>
                </div>
              )}
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion === quizData.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={showResults || Object.keys(selectedAnswers).length !== quizData.questions.length}
                  style={{backgroundColor: '#5B4B8A'}}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!selectedAnswers[currentQuestion]}
                  style={{backgroundColor: '#5B4B8A'}}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 
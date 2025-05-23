"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSpaces } from "@/hooks/space-provider";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/auth-provider";

interface QuizTabProps {
  value: string;
  activeMainTab: string;
  quizData: any;
  quizLoading: boolean;
}

export default function QuizTab({
  value,
  activeMainTab,
  quizData,
  quizLoading,
}: QuizTabProps) {
  const { id } = useParams();
  const { spaces } = useSpaces();
  const { user } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleAnswerSelect = (qIndex: number, oIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: oIndex
    }));
  };

  return (
    <TabsContent value={value} className="flex-1 min-h-0 overflow-hidden mt-4">
      {activeMainTab === value && (
        <Card className="h-full flex flex-col min-h-0">
          <ScrollArea className="p-6 flex-1">
            {quizLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {quizData && quizData.questions && quizData.questions.map((question: any, qIndex: number) => (
                  <div key={qIndex} className="space-y-4">
                    <h3 className="font-medium">
                      {qIndex + 1}. {question.question}
                    </h3>
                    <div className="grid gap-2">
                      {question.options.map((option: string, oIndex: number) => (
                        <Button
                          key={oIndex}
                          variant={
                            selectedAnswers[qIndex] === oIndex
                              ? "default"
                              : "outline"
                          }
                          className="justify-start"
                          onClick={() => handleAnswerSelect(qIndex, oIndex)}
                        >
                          <span className="mr-2">
                            {String.fromCharCode(65 + oIndex)}.
                          </span>
                          {option}
                        </Button>
                      ))}
                    </div>
                    {selectedAnswers[qIndex] !== undefined && 
                      question.options[selectedAnswers[qIndex]] === question.correct_option && (
                      <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Correct! {question.explanation}
                        </p>
                      </div>
                    )}
                    {selectedAnswers[qIndex] !== undefined &&
                      question.options[selectedAnswers[qIndex]] !== question.correct_option && (
                      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Try again! Review the related section in the video at {question.timestamp}.
                        </p>
                      </div>
                    )}
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

"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-provider";
import { toast } from "sonner";
import { RefreshCw, Check, X } from "lucide-react";

interface TermBuilderDialogProps {
  contentId?: string;
  youtubeId?: string;
}

interface TermBuilderChain {
  id: string;
  title: string;
  description: string;
  correctChain: string[];
  availableTerms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TermBuilderData {
  termBuilder: TermBuilderChain[];
}

export function TermBuilderDialog({ contentId, youtubeId }: TermBuilderDialogProps) {
  const [open, setOpen] = useState(false);
  const [termBuilderData, setTermBuilderData] = useState<TermBuilderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [userChain, setUserChain] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [chainResult, setChainResult] = useState<'correct' | 'incorrect' | null>(null);
  const { user } = useAuth();

  const fetchTermBuilder = async () => {
    if (!contentId || !user?.token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/spaces/generate/termbuilder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content_id: contentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate term builder');
      }

      const data = await response.json();
      setTermBuilderData(data);
      
    } catch (error) {
      console.error('Error fetching term builder:', error);
      setError(error instanceof Error ? error.message : 'Failed to load term builder');
      toast.error('Failed to load term builder');
    } finally {
      setLoading(false);
    }
  };

  const currentChain = termBuilderData?.termBuilder[currentChainIndex];
  const totalChains = termBuilderData?.termBuilder.length || 0;

  const addTermToChain = (term: string) => {
    if (!userChain.includes(term)) {
      setUserChain([...userChain, term]);
    }
  };

  const removeTermFromChain = (index: number) => {
    setUserChain(userChain.filter((_, i) => i !== index));
  };

  const clearChain = () => {
    setUserChain([]);
    setChainResult(null);
  };

  const checkChain = () => {
    if (!currentChain) return;

    const isCorrect = 
      userChain.length === currentChain.correctChain.length &&
      userChain.every((term, index) => term === currentChain.correctChain[index]);

    if (isCorrect) {
      setChainResult('correct');
      const chainScore = 10; // Fixed 10 points for all chains
      setScore(prev => prev + chainScore);
      
      setTimeout(() => {
        if (currentChainIndex < totalChains - 1) {
          setCurrentChainIndex(prev => prev + 1);
          setUserChain([]);
          setChainResult(null);
        } else {
          // All chains completed without toast
        }
      }, 2000);
    } else {
      setChainResult('incorrect');
      setTimeout(() => {
        setChainResult(null);
      }, 300);
    }
  };

  const resetGame = () => {
    setCurrentChainIndex(0);
    setUserChain([]);
    setScore(0);
    setChainResult(null);
  };

  const availableTermsForUser = currentChain?.availableTerms.filter(term => !userChain.includes(term)) || [];

  useEffect(() => {
    if (open && !termBuilderData && !loading) {
      fetchTermBuilder();
    }
  }, [open, termBuilderData, loading]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-green-400 to-teal-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M9 12h6"/>
              <path d="M12 9v6"/>
            </svg>
          </div>
          Term Builder
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-[#FAF7F8] dark:bg-gray-900">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M9 12h6"/>
              <path d="M12 9v6"/>
            </svg>
          </div>
          <DialogTitle className="text-xl font-semibold text-[#5B4B8A] dark:text-white">Build Knowledge Chains</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4B8A] mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Generating term builder...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchTermBuilder} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {termBuilderData && !loading && (
          <div className="space-y-4">
            {/* Score and Progress - Grouped Rectangular Sections */}
            <div className="flex gap-3 justify-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2 border border-blue-200 dark:border-blue-700 min-w-[100px]">
                <div className="text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400">Score</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{score}</div>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-2 border border-purple-200 dark:border-purple-700 min-w-[100px]">
                <div className="text-center">
                  <div className="text-xs text-purple-600 dark:text-purple-400">Chain</div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{currentChainIndex + 1} of {totalChains}</div>
                </div>
              </div>
              {currentChainIndex < totalChains - 1 ? (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2 border border-green-200 dark:border-green-700 min-w-[100px] cursor-pointer hover:bg-green-100 dark:hover:bg-green-800 transition-colors" onClick={() => {
                  setCurrentChainIndex(prev => prev + 1);
                  setUserChain([]);
                  setChainResult(null);
                }}>
                  <div className="text-center">
                    <div className="text-xs text-green-600 dark:text-green-400">Next</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">→</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700 min-w-[100px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => {
                  if (currentChainIndex > 0) {
                    setCurrentChainIndex(prev => prev - 1);
                    setUserChain([]);
                    setChainResult(null);
                  } else {
                    resetGame();
                  }
                }}>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">{currentChainIndex > 0 ? 'Previous' : 'Reset'}</div>
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                      {currentChainIndex > 0 ? '←' : <RefreshCw className="h-4 w-4 mx-auto" />}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {currentChain && (
              <div className="space-y-4">
                {/* Chain Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-[#5B4B8A] dark:text-white">
                      {currentChain.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(currentChain.difficulty)}`}>
                      {currentChain.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {currentChain.description}
                  </p>
                </div>

                {/* Your Chain */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-[#5B4B8A] dark:text-white mb-3">Your Chain:</h4>
                  <div className="min-h-[60px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 flex flex-wrap gap-2 items-center">
                    {userChain.length === 0 ? (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        Click concepts below to build your chain
                      </span>
                    ) : (
                      userChain.map((term, index) => (
                        <div key={index} className="flex items-center">
                          <div 
                            className="bg-[#5B4B8A] text-white px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-[#4a3d75] transition-colors flex items-center gap-1"
                            onClick={() => removeTermFromChain(index)}
                          >
                            {term}
                            <X className="h-3 w-3" />
                          </div>
                          {index < userChain.length - 1 && (
                            <div className="mx-1 text-gray-400">→</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Chain Result */}
                {chainResult && (
                  <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className={`rounded-lg p-4 border max-w-[300px] ${
                      chainResult === 'correct' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center justify-center">
                        {chainResult === 'correct' ? (
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className={`font-medium ${
                          chainResult === 'correct' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>
                          {chainResult === 'correct' ? '🎉 Correct chain!' : 'Try a different order!'}
                        </span>
                      </div>
                      {chainResult === 'correct' && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400 text-center">
                          Correct sequence: {currentChain.correctChain.join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Available Concepts */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-[#5B4B8A] dark:text-white mb-3">Available Concepts:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTermsForUser.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => addTermToChain(term)}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-colors text-xs font-medium min-h-[40px] flex items-center justify-center"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={checkChain} 
                    disabled={userChain.length === 0 || chainResult === 'correct'}
                    className="bg-[#8B7AD6] hover:bg-[#7B6AC6] text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-32"
                  >
                    Check Chain
                  </Button>
                  <Button 
                    onClick={clearChain} 
                    variant="outline"
                    disabled={userChain.length === 0}
                    className="py-2 px-6 text-sm w-32"
                  >
                    Clear Chain
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

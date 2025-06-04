"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-provider";
import { toast } from "sonner";
import { Shuffle, X, CheckCircle } from "lucide-react";

interface ConceptMatchDialogProps {
  contentId?: string;
  youtubeId?: string;
}

interface ConceptMatchPair {
  id: string;
  concept: string;
  definition: string;
}

interface ConceptMatchData {
  conceptMatch: ConceptMatchPair[];
}

interface SelectedMatch {
  conceptId: string;
  definitionId: string;
}

export function ConceptMatchDialog({ contentId, youtubeId }: ConceptMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [conceptMatchData, setConceptMatchData] = useState<ConceptMatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
  const [matches, setMatches] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [correctMatches, setCorrectMatches] = useState<Set<string>>(new Set());
  const [showError, setShowError] = useState<string | null>(null);
  const { user } = useAuth();

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [shuffledConcepts, setShuffledConcepts] = useState<ConceptMatchPair[]>([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<ConceptMatchPair[]>([]);

  const fetchConceptMatch = async () => {
    if (!contentId || !user?.token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/spaces/generate/conceptmatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content_id: contentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate concept match');
      }

      const data = await response.json();
      setConceptMatchData(data);
      
      // Shuffle the concepts and definitions
      setShuffledConcepts(shuffleArray(data.conceptMatch));
      setShuffledDefinitions(shuffleArray(data.conceptMatch));
      
    } catch (error) {
      console.error('Error fetching concept match:', error);
      setError(error instanceof Error ? error.message : 'Failed to load concept match');
      toast.error('Failed to load concept match');
    } finally {
      setLoading(false);
    }
  };

  const handleConceptClick = (conceptId: string) => {
    if (correctMatches.has(conceptId)) return; // Already matched
    setSelectedConcept(conceptId);
    
    if (selectedDefinition) {
      // Check if this is a correct match
      const isCorrect = conceptId === selectedDefinition;
      
      if (isCorrect) {
        setCorrectMatches(prev => new Set([...prev, conceptId]));
        setMatches(prev => prev + 1);
        setScore(prev => prev + 10);
        setSelectedConcept(null);
        setSelectedDefinition(null);
        
        // Check if all matches are complete
        if (correctMatches.size + 1 === conceptMatchData?.conceptMatch.length) {
          // Show completion message without toast
        }
      } else {
        setShowError('Try again!');
        setTimeout(() => {
          setShowError(null);
          setSelectedConcept(null);
          setSelectedDefinition(null);
        }, 800);
      }
    }
  };

  const handleDefinitionClick = (definitionId: string) => {
    if (correctMatches.has(definitionId)) return; // Already matched
    setSelectedDefinition(definitionId);
    
    if (selectedConcept) {
      // Check if this is a correct match
      const isCorrect = selectedConcept === definitionId;
      
      if (isCorrect) {
        setCorrectMatches(prev => new Set([...prev, definitionId]));
        setMatches(prev => prev + 1);
        setScore(prev => prev + 10);
        setSelectedConcept(null);
        setSelectedDefinition(null);
        
        // Check if all matches are complete
        if (correctMatches.size + 1 === conceptMatchData?.conceptMatch.length) {
          // Show completion message without toast
        }
      } else {
        setShowError('Try again!');
        setTimeout(() => {
          setShowError(null);
          setSelectedConcept(null);
          setSelectedDefinition(null);
        }, 800);
      }
    }
  };

  const resetGame = () => {
    setSelectedConcept(null);
    setSelectedDefinition(null);
    setMatches(0);
    setScore(0);
    setCorrectMatches(new Set());
    setShowError(null);
    if (conceptMatchData) {
      setShuffledConcepts(shuffleArray(conceptMatchData.conceptMatch));
      setShuffledDefinitions(shuffleArray(conceptMatchData.conceptMatch));
    }
  };

  useEffect(() => {
    if (open && !conceptMatchData && !loading) {
      fetchConceptMatch();
    }
  }, [open, conceptMatchData, loading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          Concept Match
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-[#FAF7F8] dark:bg-gray-900">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
          </div>
          <DialogTitle className="text-xl font-semibold text-[#5B4B8A] dark:text-white">Concept Match</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4B8A] mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Generating concept match...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchConceptMatch} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {conceptMatchData && !loading && (
          <div className="space-y-4">
            {/* Score Display - Grouped Rectangular Buttons */}
            <div className="flex gap-3 justify-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2 border border-blue-200 dark:border-blue-700 min-w-[100px]">
                <div className="text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400">Score</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{score}</div>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2 border border-green-200 dark:border-green-700 min-w-[100px]">
                <div className="text-center">
                  <div className="text-xs text-green-600 dark:text-green-400">Matches</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{matches}/{conceptMatchData.conceptMatch.length}</div>
                </div>
                  </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700 min-w-[100px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={resetGame}>
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Reset</div>
                  <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                    <Shuffle className="h-4 w-4 mx-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {matches === conceptMatchData.conceptMatch.length && matches > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    🎉 Congratulations! All matches completed!
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-gray-600 dark:text-gray-300 text-sm">
              Select one concept and one definition to make a match
            </div>

            {/* Game Area - Equal Height Columns */}
            <div className="grid grid-cols-[0.8fr_1.7fr] gap-3 h-[450px] px-2">
              <style jsx>{`
                .match-column {
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                }
                .match-scroll {
                  flex: 1;
                  overflow-y: auto;
                  overflow-x: hidden;
                }
              `}</style>
              {/* Concepts Column */}
              <div className="match-column">
                <h3 className="text-lg font-semibold text-[#5B4B8A] dark:text-white text-center mb-3">Concepts</h3>
                <div className="match-scroll pr-2 space-y-2">
                  {shuffledConcepts.map((item) => (
                    <div
                      key={`concept-${item.id}`}
                      onClick={() => handleConceptClick(item.id)}
                      className={`p-2 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] flex items-center ${
                        correctMatches.has(item.id)
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-500 cursor-not-allowed'
                          : selectedConcept === item.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      style={{ height: 'auto', minHeight: '60px' }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-gray-900 dark:text-white text-sm break-words flex-1 my-auto">{item.concept}</span>
                        {correctMatches.has(item.id) && (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Definitions Column */}
              <div className="match-column">
                <h3 className="text-lg font-semibold text-[#5B4B8A] dark:text-white text-center mb-3">Definitions</h3>
                <div className="match-scroll pl-2 space-y-2 overflow-x-auto">
                  {shuffledDefinitions.map((item) => (
                    <div
                      key={`definition-${item.id}`}
                      onClick={() => handleDefinitionClick(item.id)}
                      className={`p-2 rounded-lg border-2 cursor-pointer transition-all min-h-[60px] flex items-center ${
                        correctMatches.has(item.id)
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-500 cursor-not-allowed'
                          : selectedDefinition === item.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      style={{ height: 'auto', minHeight: '60px' }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-normal min-w-full pr-2 my-auto">{item.definition}</span>
                        {correctMatches.has(item.id) && (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
                        )}
                  </div>
                </div>
              ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message Popup */}
        {showError && (
          <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-red-50 dark:bg-red-900/90 border-2 border-red-300 dark:border-red-700 rounded-lg p-3 max-w-[200px] shadow-none">
              <div className="flex items-center justify-center">
                <span className="text-red-700 dark:text-red-200 font-semibold text-sm">❌ Try again!</span>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

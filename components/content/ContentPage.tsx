"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth-provider";
import LeftPanel from "./LeftPanel";
import RightSidebar from "./RightSidebar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import axios from "axios";

interface SummaryResponse {
  message: string;
  data: string | any;
}

interface SummarySection {
  type: 'heading' | 'paragraph' | 'list_item';
  level?: number;
  content: string;
}

interface SummaryData {
  sections: SummarySection[];
}

interface ContentPageProps {
  id: string; // from useParams
}

interface ContentData {
  id: string;
  title: string;
  summary?: SummarySection[];
  content?: string;
  youtube_url?: string;
  youtube_id?: string;
  created_at?: string;
}

export default function ContentPage({ id }: ContentPageProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [mindmapData, setMindmapData] = useState<any>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [flashcardsData, setFlashcardsData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  
  // Loading states
  const [mindmapLoading, setMindmapLoading] = useState<boolean>(false);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState<boolean>(false);
  const [audioLoading, setAudioLoading] = useState<boolean>(false);
  const [transcriptLoading, setTranscriptLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

  // Add function to fetch summary
  const fetchSummary = async (contentId: string, forceRegenerate: boolean = false) => {
    console.log(`⭐ fetchSummary called for contentId: ${contentId}, force: ${forceRegenerate}`);
    
    if (!contentId) {
      console.error('❌ Cannot fetch summary: contentId is missing');
      return;
    }
    
    if (!user?.token) {
      console.error('❌ Cannot fetch summary: user token is missing');
      return;
    }
    
    console.log(`📋 Auth token present: ${!!user.token}`);
    
    try {
      // Always fetch from API - skip cache for debugging
      let shouldFetchFromApi = true;
      
      // Temporarily disable cache checking to debug the issue
      // We'll manually clear any existing cache
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`n2n-content-${contentId}-summary`);
          console.log('🧹 Cleared summary cache to force fresh API call');
        } catch (e) {
          console.warn('Could not clear cache:', e);
        }
      }
      
      if (shouldFetchFromApi) {
        setSummaryLoading(true);
        console.log('🔄 Fetching summary from API for content ID:', contentId);
        
        // Create full URL for logging purposes
        const apiUrl = `/api/spaces/generate/summary?content_id=${contentId}${forceRegenerate ? '&force=true' : ''}`;
        console.log('📡 API URL:', apiUrl);
        
        try {
          console.log('🔑 Using token:', user.token.substring(0, 10) + '...');
          
          const response = await axios.get<SummaryResponse>(
            apiUrl,
            {
              headers: { 
                Authorization: `Bearer ${user.token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          );
          
          console.log('Summary API response received:', response.data);
          
          if (response.data?.data) {
            try {
              // The API may return data in different formats, ensure it's properly parsed
              let summaryData = response.data.data;
              
              // If it's a string, try to parse it as JSON
              if (typeof summaryData === 'string') {
                try {
                  console.log('Summary data is a string, attempting to parse:', summaryData.substring(0, 50) + '...');
                  
                  // First, check if it looks like JSON (starts with { or [)
                  const trimmed = summaryData.trim();
                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    summaryData = JSON.parse(summaryData);
                  } else {
                    // It's plain text, wrap it in a proper structure
                    console.log('Summary data appears to be plain text, wrapping in structure');
                    summaryData = {
                      sections: [
                        {
                          type: 'heading',
                          level: 2,
                          content: 'Summary'
                        },
                        {
                          type: 'paragraph',
                          content: summaryData
                        }
                      ]
                    };
                  }
                } catch (parseError) {
                  console.error('Failed to parse summary data string as JSON:', parseError);
                  console.log('Converting plain text to structured format');
                  
                  // If JSON parsing fails, treat as plain text and structure it
                  summaryData = {
                    sections: [
                      {
                        type: 'heading',
                        level: 2,
                        content: 'Summary'
                      },
                      {
                        type: 'paragraph',
                        content: summaryData
                      }
                    ]
                  };
                }
              }
              
              // Handle case where we might have a nested 'sections' property or direct array
              if (summaryData && typeof summaryData === 'object' && 'sections' in summaryData && Array.isArray(summaryData.sections)) {
                // Use the sections array from the object
                console.log('Found sections array in summaryData object');
                summaryData = summaryData.sections;
              } else if (Array.isArray(summaryData)) {
                // It's already an array, use it directly
                console.log('Summary data is already an array');
              } else if (summaryData && typeof summaryData === 'object') {
                // It's an object but not in expected format, try to extract content
                console.log('Summary data is an object, trying to extract meaningful content');
                const content = summaryData.content || summaryData.summary || JSON.stringify(summaryData);
                summaryData = [
                  {
                    type: 'heading',
                    level: 2,
                    content: 'Summary'
                  },
                  {
                    type: 'paragraph',
                    content: String(content)
                  }
                ];
              } else {
                // Fallback for any other format
                console.log('Summary data in unexpected format, creating fallback');
                summaryData = [
                  {
                    type: 'heading',
                    level: 2,
                    content: 'Summary'
                  },
                  {
                    type: 'paragraph',
                    content: 'Summary data could not be properly formatted.'
                  }
                ];
              }
              
              // Final validation that we have an array
              if (!Array.isArray(summaryData)) {
                console.error('Expected array of sections but got:', typeof summaryData, summaryData);
                summaryData = [
                  {
                    type: 'heading',
                    level: 2,
                    content: 'Summary'
                  },
                  {
                    type: 'paragraph',
                    content: 'Summary format could not be processed.'
                  }
                ];
              }
              
              console.log('Valid summary sections array received, length:', summaryData.length);
              
              // Use the sections array directly - API should already validate format
              const validSections = summaryData.map((section: any) => {
                // Basic validation to ensure objects have required properties
                if (!section || typeof section !== 'object') {
                  return { type: 'paragraph' as const, content: String(section || 'Invalid section data') };
                }
                
                // Ensure type is one of the allowed values
                const validTypes = ['heading', 'paragraph', 'list_item'];
                const type = validTypes.includes(section.type) 
                  ? section.type as SummarySection['type']
                  : 'paragraph' as const;
                
                // Ensure content is a string
                const content = typeof section.content === 'string' 
                  ? section.content 
                  : String(section.content || section.text || section.title || '');
                  
                return {
                  type,
                  level: section.level,
                  content
                };
              });
              
              console.log('Processed summary sections:', validSections.length);
              
              // Save to state
              // Important: Set the validated array of sections directly to content.summary
              setContent(prev => {
                if (!prev) return null;
                console.log('Setting summary in content state:', validSections);
                return {
                  ...prev,
                  summary: validSections
                };
              });
              
              // Cache the successful response
              if (typeof window !== 'undefined') {
                localStorage.setItem(`n2n-content-${contentId}-summary`, JSON.stringify({
                  data: validSections,  // Store the processed array directly
                  timestamp: new Date().getTime()
                }));
              }
            } catch (parseError) {
              console.error('Error processing summary data:', parseError);
              
              // If we can't process the existing summary, try to regenerate it
              console.log('Attempting to regenerate summary due to parsing error');
              try {
                // Try to fetch a fresh summary by forcing regeneration
                const regenerateResponse = await axios.get<SummaryResponse>(
                  `/api/spaces/generate/summary?content_id=${contentId}&force=true`,
                  {
                    headers: { 
                      Authorization: `Bearer ${user.token}`,
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache'
                    }
                  }
                );
                
                if (regenerateResponse.data?.data) {
                  console.log('Successfully regenerated summary:', regenerateResponse.data.data);
                  // Process the regenerated summary using the same logic above
                  let regeneratedSummary = regenerateResponse.data.data;
                  
                  if (typeof regeneratedSummary === 'string') {
                    const trimmed = regeneratedSummary.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                      regeneratedSummary = JSON.parse(regeneratedSummary);
                    }
                  }
                  
                  if (regeneratedSummary?.sections && Array.isArray(regeneratedSummary.sections)) {
                    regeneratedSummary = regeneratedSummary.sections;
                  } else if (!Array.isArray(regeneratedSummary)) {
                    regeneratedSummary = [
                      { type: 'heading', level: 2, content: 'Summary' },
                      { type: 'paragraph', content: String(regeneratedSummary) }
                    ];
                  }
                  
                  const validRegeneratedSections = regeneratedSummary.map((section: any) => ({
                    type: section.type || 'paragraph',
                    level: section.level,
                    content: String(section.content || section.text || section.title || '')
                  }));
                  
                  setContent(prev => {
                    if (!prev) return null;
                    return { ...prev, summary: validRegeneratedSections };
                  });
                  
                  return; // Exit successfully after regeneration
                }
              } catch (regenerateError) {
                console.error('Failed to regenerate summary:', regenerateError);
              }
              
              // Create a simple fallback if regeneration also fails
              const fallbackSummary: SummaryData = {
                sections: [
                  { 
                    type: 'heading',
                    level: 1,
                    content: 'Summary Unavailable'
                  },
                  {
                    type: 'paragraph',
                    content: 'We were unable to load or generate a summary for this content. The data may be in an old format. Please try refreshing the page.'
                  }
                ]
              };
              
              // Save fallback to state
              setContent(prev => prev ? { ...prev, summary: fallbackSummary.sections } : null);
            }
          } else {
            console.error('No data in summary response');
          }
        } catch (apiError) {
          console.error('Error making summary API request:', apiError);
        } finally {
          setSummaryLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummaryLoading(false);
    }
  };

  // Fetch content when component mounts
  useEffect(() => {
    if (user?.token) {
      fetchContent();
    }
  }, [id, user]);

  // Fetch content from API
  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contents?id=${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      
      if (!res.ok) throw new Error('Failed to load content');
      
      const data = await res.json();
      
      // Update content first
      // Check if data.summary is in the new format or needs conversion
      let processedSummary = [];
      
      if (data.summary) {
        if (Array.isArray(data.summary)) {
          // Check if each item has a type property (new format)
          if (data.summary.length > 0 && typeof data.summary[0] === 'object' && data.summary[0] !== null && 'type' in data.summary[0]) {
            processedSummary = data.summary;
          } else {
            // Convert string array to structured format
            processedSummary = data.summary.map((item: string) => ({ 
              type: 'paragraph' as const, 
              content: String(item)
            }));
          }
        } else if (typeof data.summary === 'string') {
          // Try to parse if it's a JSON string
          try {
            const trimmed = data.summary.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              // Looks like JSON, try to parse
              const parsed = JSON.parse(data.summary);
              if (parsed.sections && Array.isArray(parsed.sections)) {
                processedSummary = parsed.sections;
              } else if (Array.isArray(parsed)) {
                processedSummary = parsed.map((item: any) => {
                  if (typeof item === 'object' && item.type && item.content) {
                    return item;
                  }
                  return { type: 'paragraph', content: String(item) };
                });
              } else {
                // Single object, wrap in paragraph
                processedSummary = [{ type: 'paragraph', content: String(parsed) }];
              }
            } else {
              // Plain text, wrap it properly
              processedSummary = [
                { type: 'heading', level: 2, content: 'Summary' },
                { type: 'paragraph', content: data.summary }
              ];
            }
          } catch {
            // Not JSON, treat as plain text
            processedSummary = [
              { type: 'heading', level: 2, content: 'Summary' },
              { type: 'paragraph', content: data.summary }
            ];
          }
        } else if (typeof data.summary === 'object' && data.summary !== null) {
          // It might already be in the correct format
          if (data.summary.sections && Array.isArray(data.summary.sections)) {
            processedSummary = data.summary.sections;
          } else {
            // Object but not in expected format
            const content = data.summary.content || data.summary.summary || JSON.stringify(data.summary);
            processedSummary = [
              { type: 'heading', level: 2, content: 'Summary' },
              { type: 'paragraph', content: String(content) }
            ];
          }
        }
      }
      
      setContent({
        ...data,
        summary: processedSummary
      });
      
          // Only fetch data that's not already loaded
      if (data.id) {
        // Track in-flight requests to prevent duplicates
        const inFlightRequests = new Set<string>();
        
        // Add debounce to prevent rapid API calls
        const debounce = (fn: Function, delay: number) => {
          let timeout: NodeJS.Timeout;
          return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
          };
        };
        
        // Consolidate and prioritize API calls with caching
        const fetchDataSequentially = async () => {
          try {
            // Create a cache key based on content ID
            const cachePrefix = `n2n-content-${data.id}`;
            
            // Helper to check if data exists in cache
            const checkCache = (key: string) => {
              // Skip localStorage in SSR context
              if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                return null;
              }
              
              try {
                const cached = localStorage.getItem(`${cachePrefix}-${key}`);
                if (cached) {
                  const parsed = JSON.parse(cached);
                  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'timestamp' in parsed) {
                    const { data: cachedData, timestamp } = parsed;
                    const now = new Date().getTime();
                    // Cache valid for 30 minutes
                    if (now - timestamp < 30 * 60 * 1000) {
                      return cachedData;
                    }
                  }
                }
              } catch (e) {
                console.warn('Cache read error:', e);
                // Silent fail, just continue with API fetch
              }
              return null;
            };
            
            // Helper to save data to cache
            const saveToCache = (key: string, data: any) => {
              // Skip localStorage in SSR context
              if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                return;
              }
              
              try {
                // Only cache if data is valid
                if (data !== undefined && data !== null) {
                  localStorage.setItem(`${cachePrefix}-${key}`, JSON.stringify({
                    data,
                    timestamp: new Date().getTime()
                  }));
                }
              } catch (e) {
                console.warn('Cache write error:', e);
                // Silent fail on storage errors
              }
            };
            
            // Generic helper for fetching with cache
            const fetchWithCache = async (key: string, fetchFn: Function, ...args: any[]) => {
              // Extract forceRefresh from args if it exists (last parameter)
              const forceRefresh = typeof args[args.length - 1] === 'boolean' ? args.pop() : false;
              
              // Check if we're already fetching this data
              if (inFlightRequests.has(key)) {
                console.log(`Skipping duplicate request for ${key}`);
                return null;
              }
              
              inFlightRequests.add(key);
              console.log(`Fetching ${key} data... ${forceRefresh ? '(forced refresh)' : ''}`);
              
              try {
                // For summary or when forceRefresh is true, skip cache and fetch fresh data
                if (key === 'summary' || forceRefresh) {
                  console.log(`Forcing fresh ${key} fetch`);
                  const result = await fetchFn(...args);
                  return result;
                }
                
                // For other data types, try cache first
                const cachedData = checkCache(key);
                if (cachedData) {
                  console.log(`Using cached ${key} data`);
                  return cachedData;
                }
                
                // Fetch fresh data if not in cache
                const result = await fetchFn(...args);
                return result;
              } finally {
                inFlightRequests.delete(key);
              }
              return null;
            };
            
            // First priority: Fetch summary and transcript - crucial for reading
            // Always fetch the summary - removing the conditional check that was preventing it
            console.log('Fetching summary regardless of existing data');
            await fetchWithCache('summary', fetchSummary, data.id, false);
            
            // Debug what summary data looks like after fetch
            console.log('After fetch summary check:', {
              hasSummary: !!data.summary,
              summaryType: typeof data.summary,
              isArray: Array.isArray(data.summary),
              length: Array.isArray(data.summary) ? data.summary.length : 0
            });
            
            if (!transcriptData) {
              await fetchWithCache('transcript', fetchTranscript, data.youtube_id || '', data.id);
            }
            
            // Second priority: Fetch audio - needed for accessibility
            if (!audioData) {
              await fetchWithCache('audio', fetchAudio, data.youtube_id || '', data.id);
            }
            
            // Lower priority: Fetch supplementary learning materials in parallel
            await Promise.allSettled([
              !mindmapData ? fetchWithCache('mindmap', fetchMindmap, data.youtube_id || '', data.id) : Promise.resolve(),
              // Force a fresh fetch for flashcards data to resolve sample data issues
              fetchWithCache('flashcards', fetchFlashcards, data.youtube_id || '', data.id, true),
              // Force a fresh fetch for quiz data to resolve sample data issues
              fetchWithCache('quiz', fetchQuiz, data.youtube_id || '', data.id, true)
            ]);
          } catch (error) {
            console.error('Error loading content data:', error);
          }
        };
        
        fetchDataSequentially();
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch mindmap data
  const fetchMindmap = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setMindmapLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/mindmap?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      // Check if response has data property and it's not null/undefined
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setMindmapData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching mindmap data:", error);
    } finally {
      setMindmapLoading(false);
    }
  };
  
  // Fetch quiz data
  const fetchQuiz = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setQuizLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/quiz?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      
      if (response && response.data) {
        console.log('Quiz API response:', response.data);
        // Handle different response formats
        let quizContent;
        
        if (typeof response.data === 'object' && response.data !== null) {
          // Normal API response format with data property
          if ('data' in response.data && response.data.data) {
            quizContent = response.data.data;
            console.log('Quiz data from response.data.data:', quizContent);
          } 
          // Direct quiz object format
          else if ('quiz' in response.data) {
            quizContent = response.data.quiz;
            console.log('Quiz data from response.data.quiz:', quizContent);
          }
          // Fallback quiz format
          else if ('questions' in response.data) {
            quizContent = { quiz: response.data.questions };
            console.log('Quiz data from response.data.questions:', quizContent);
          } else {
            // Try to use the response.data directly
            quizContent = response.data;
            console.log('Using response.data directly as quiz content:', quizContent);
          }
          
          if (quizContent) {
            console.log('Setting quiz data:', quizContent);
            setQuizData(quizContent);
            // Cache the successful response
            localStorage.setItem(`n2n-content-${content_id}-quiz`, JSON.stringify({
              data: quizContent,
              timestamp: new Date().getTime()
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      
      // Check if we have a cached version
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`n2n-content-${content_id}-quiz`);
          if (cached) {
            const { data: cachedData } = JSON.parse(cached);
            if (cachedData) {
              setQuizData(cachedData);
              console.log('Using cached quiz data');
            }
          }
        }
      } catch (cacheError) {
        console.warn('Error retrieving cached quiz:', cacheError);
      }
    } finally {
      setQuizLoading(false);
    }
  };
  
  // Fetch flashcards data
  const fetchFlashcards = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setFlashcardsLoading(true);
      const response = await axios.get(
        `/api/spaces/generate/flashcards?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data) {
        console.log('Flashcards API response:', response.data);
        let flashcardsContent;
        
        if (typeof response.data === 'object' && response.data !== null) {
          // Normal API response format with data property
          if ('data' in response.data && response.data.data) {
            flashcardsContent = response.data.data;
            console.log('Flashcards from response.data.data:', flashcardsContent);
          } 
          // Direct flashcards array format
          else if (Array.isArray(response.data)) {
            flashcardsContent = { flashcards: response.data };
            console.log('Flashcards from array response:', flashcardsContent);
          }
          // Direct flashcards object format
          else if ('flashcards' in response.data) {
            flashcardsContent = response.data;
            console.log('Flashcards from response.data.flashcards:', flashcardsContent);
          } else {
            // Try to use the response.data directly
            flashcardsContent = response.data;
            console.log('Using response.data directly as flashcards:', flashcardsContent);
          }
          
          if (flashcardsContent) {
            console.log('Setting flashcards data:', flashcardsContent);
            setFlashcardsData(flashcardsContent);
            // Cache the successful response
            localStorage.setItem(`n2n-content-${content_id}-flashcards`, JSON.stringify({
              data: flashcardsContent,
              timestamp: new Date().getTime()
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching flashcards data:", error);
    } finally {
      setFlashcardsLoading(false);
    }
  };
  
  // Define audio data interfaces at the component scope for reuse
  interface AudioData {
    audioUrl: string;
    summaryText: string | any;
  }

  // Fetch audio summary with improved error handling
  const fetchAudio = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) {
      console.error('Cannot fetch audio: missing content_id or token');
      return;
    }
    
    try {
      setAudioLoading(true);
      console.log('Fetching audio for content ID:', content_id);
      
      // Force refresh by adding a timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      const apiUrl = `/api/spaces/generate/audio?content_id=${content_id}&_t=${timestamp}`;
      console.log('Audio API URL:', apiUrl);
      
      // Define the exact API response structure from the server
      interface AudioApiResponse {
        message: string;
        data: {
          audioUrl: string;
          summaryText: string | any;
        }
      }
      
      const response = await axios.get<AudioApiResponse>(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      console.log('Audio API response status:', response.status);
      console.log('Audio API response message:', response.data.message);
      
      // Check if the response contains the data we need
      if (response?.data?.data) {
        // Access the audio data directly
        const audioData = response.data.data;
        
        // Verify audioUrl exists and is a properly formatted string
        if (!audioData.audioUrl || typeof audioData.audioUrl !== 'string') {
          throw new Error('Invalid audio URL received from server');
        }
        
        // Check if audioUrl contains 'object Object' which indicates a stringification issue
        if (audioData.audioUrl.includes('[object Object]') || audioData.audioUrl.includes('%5Bobject%20Object%5D')) {
          throw new Error('Invalid audio URL format: contains object reference');
        }
        
        // Ensure the audioUrl uses the proxy endpoint correctly
        let audioUrl = audioData.audioUrl;
        
        // If this isn't already a proxied URL, it's likely a direct Google TTS URL
        // which needs to be proxied to avoid CORS issues
        if (audioUrl && typeof audioUrl === 'string' && !audioUrl.startsWith('/api/proxy/audio') && !audioUrl.includes('localhost') && !audioUrl.includes('127.0.0.1')) {
          try {
            // Test URL validity
            new URL(audioUrl);
            // Ensure URL is properly encoded
            const encodedUrl = encodeURIComponent(audioUrl);
            audioUrl = `/api/proxy/audio?url=${encodedUrl}&format=mp3&_t=${timestamp}`;
            console.log('Converted to proxied URL:', audioUrl);
          } catch (error) {
            console.error('Invalid URL format:', audioUrl, error);
            throw new Error(`Invalid audio URL format: ${audioUrl}`);
          }
        } else if (audioUrl && typeof audioUrl === 'string' && !audioUrl.includes('format=')) {
          // Add format parameter to existing proxy URL if not present
          audioUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}format=mp3&_t=${timestamp}`;
          console.log('Added format parameter to URL:', audioUrl);
        }
        
        // Format the audio data object correctly
        const formattedAudioData: AudioData = {
          audioUrl: audioUrl,
          summaryText: typeof audioData.summaryText === 'string' 
            ? audioData.summaryText 
            : String(audioData.summaryText || '')
        };
        
        console.log('Formatted audio data:', formattedAudioData);
        setAudioData(formattedAudioData);
      } else {
        console.warn('No data field in API response:', response.data);
        throw new Error('No audio data received from server');
      }
    } catch (error) {
      console.error("Error fetching audio data:", error);
      // Note: We don't have setAudioError in this component, errors are handled in AudioPlayer
    } finally {
      setAudioLoading(false);
    }
  };
  
  // Fetch transcript data
  const fetchTranscript = async (youtube_id: string, content_id: string) => {
    if (!content_id || !user?.token) return;
    try {
      setTranscriptLoading(true);
      const response = await axios.get(
        `/api/contents/transcript?content_id=${content_id}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      if (response && response.data && typeof response.data === 'object' && response.data !== null) {
        const apiResponse = response.data as { data?: any };
        if (apiResponse.data) {
          setTranscriptData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error fetching transcript data:", error);
    } finally {
      setTranscriptLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!content) {
    return <div className="p-8">Content not found</div>;
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Left Panel with Summary */}
      <div className="flex-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <LeftPanel 
          id={content.id}
          title={content.title}
          summary={Array.isArray(content.summary) ? content.summary : []}
          loading={summaryLoading}
        />
        {/* Debug display - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-blue-100 text-blue-800 text-xs">

            length: {Array.isArray(content.summary) ? content.summary.length : 0}
          </div>
        )}
      </div>
      
      {/* Right Sidebar */}
      <div className="border-l border-gray-200 dark:border-gray-700 h-full">
        <RightSidebar 
          contentId={content.id}
          youtubeId={content.youtube_id}
          mindmapData={mindmapData}
          mindmapLoading={mindmapLoading}
          quizData={quizData}
          quizLoading={quizLoading}
          flashcardsData={flashcardsData}
          flashcardsLoading={flashcardsLoading}
          audioData={audioData}
          audioLoading={audioLoading}
          transcriptData={transcriptData}
          transcriptLoading={transcriptLoading}
          contentTitle={content.title}
        />
      </div>
    </div>
  );
}

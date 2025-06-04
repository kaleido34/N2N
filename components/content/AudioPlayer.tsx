"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Headphones, RefreshCw, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ChunkedAudioData {
  type: "chunked_audio";
  totalChunks: number;
  chunks: string[];
  metadata: {
    contentId: string;
    totalLength: number;
    chunkSizes: number[];
  };
}

interface AudioPlayerProps {
  isVisible: boolean;
  onClose: () => void;
  contentTitle?: string;
  audioData?: {
    audioUrl: string;
    isChunked?: boolean;
    chunkCount?: number;
    totalLength?: number;
  };
  audioLoading?: boolean;
  contentId?: string;
  youtubeId?: string;
}

export function AudioPlayer({ isVisible, onClose, contentTitle, audioData, audioLoading, contentId, youtubeId }: AudioPlayerProps) {
  const title = contentTitle || "Lecture Audio";
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isSeekable, setIsSeekable] = useState(false);
  
  // Chunked audio state
  const [chunkedData, setChunkedData] = useState<ChunkedAudioData | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [chunkDurations, setChunkDurations] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const loadingRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced audio URL handling
  const audioUrl = audioData?.audioUrl || "";
  const isChunked = audioData?.isChunked || false;
  const chunkCount = audioData?.chunkCount || 1;
  const totalTextLength = audioData?.totalLength || 0;

  // Debug logging
  useEffect(() => {
    if (audioData) {
      console.log('AudioPlayer received enhanced audioData:', {
        url: audioUrl,
        isChunked,
        chunkCount,
        totalLength: totalTextLength
      });
    }
  }, [audioData, audioUrl, isChunked, chunkCount, totalTextLength]);

  // Fetch chunked audio data if needed
  useEffect(() => {
    const fetchChunkedData = async () => {
      if (audioUrl && audioUrl.includes('/chunked?')) {
        try {
          console.log('🔍 Fetching chunked audio data from:', audioUrl);
          setIsLoading(true);
          setLoadingProgress(10);
          
          const response = await fetch(audioUrl);
          console.log('📡 Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch chunked data: ${response.status} ${response.statusText}`);
          }
          
          const contentType = response.headers.get('content-type');
          console.log('📄 Response content type:', contentType);
          
          if (!contentType?.includes('application/json')) {
            console.log('❌ Expected JSON but got:', contentType);
            throw new Error(`Expected JSON response but got: ${contentType}`);
          }
          
          const data = await response.json();
          console.log('📦 Chunked audio response data:', {
            type: data.type,
            totalChunks: data.totalChunks,
            hasChunks: !!data.chunks,
            chunksLength: data.chunks?.length,
            firstChunkSample: data.chunks?.[0]?.substring(0, 50) + '...',
            metadata: data.metadata
          });
          
          if (data.type === "chunked_audio" && data.chunks && Array.isArray(data.chunks)) {
            console.log('✅ Valid chunked audio data received');
            console.log('🎵 Sample chunk URLs:', data.chunks.slice(0, 3).map((url: string, i: number) => `${i}: ${url.substring(0, 80)}...`));
            
            setChunkedData(data);
            setCurrentChunk(0);
            // Estimate total duration (about 3 seconds per chunk on average)
            setTotalDuration(data.totalChunks * 3);
            setLoadingProgress(50);
            
            console.log('🎯 Chunked data state updated, audio setup should proceed');
          } else {
            console.error('❌ Invalid chunked audio response format:', data);
            setAudioError('Invalid audio data format received');
          }
        } catch (error) {
          console.error('💥 Error fetching chunked audio data:', error);
          setAudioError(`Failed to load chunked audio: ${error}`);
          setIsLoading(false);
        }
      } else {
        // Clear chunked data for non-chunked URLs
        if (chunkedData) {
          console.log('🧹 Clearing chunked data for non-chunked URL');
          setChunkedData(null);
          setCurrentChunk(0);
          setTotalDuration(0);
          setChunkDurations([]);
        }
      }
    };
    
    fetchChunkedData();
  }, [audioUrl]);

  // Loading progress simulation for chunked audio
  useEffect(() => {
    if (isLoading && (isChunked || chunkedData) && chunkCount > 1) {
      setLoadingProgress(0);
      const estimatedTime = chunkCount * 1.2;
      const interval = 100;
      const increment = (interval / (estimatedTime * 1000)) * 100;
      
      loadingRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            return prev;
          }
          return Math.min(prev + increment, 95);
        });
      }, interval);
      
      return () => {
        if (loadingRef.current) {
          clearInterval(loadingRef.current);
          loadingRef.current = null;
        }
      };
    }
  }, [isLoading, isChunked, chunkCount, chunkedData]);

  // Enhanced volume and mute handling
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Enhanced audio setup with chunked audio support
  useEffect(() => {
    console.log('🎵 Audio setup effect triggered:', {
      audioUrl: audioUrl?.substring(0, 100) + '...',
      chunkedData: chunkedData ? `${chunkedData.totalChunks} chunks available` : 'none',
      currentChunk,
      hasAudioRef: !!audioRef.current
    });

    // Cleanup previous audio
    if (audioRef.current) {
      console.log('🧹 Cleaning up previous audio element');
      const oldAudio = audioRef.current;
      
      // Pause and reset the audio element (this removes most event listeners)
      oldAudio.pause();
      oldAudio.src = '';
      oldAudio.load(); // Force reset
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      
      // Clear the ref last
      audioRef.current = null;
      
      // Reset states
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsSeekable(false);
    }
    
    if (loadingRef.current) {
      clearInterval(loadingRef.current);
      loadingRef.current = null;
    }
    
    // Skip setup if this is a chunked URL that hasn't been processed yet
    if (audioUrl && audioUrl.includes('/chunked?') && !chunkedData) {
      console.log('⏳ Waiting for chunked data to be fetched before setting up audio...');
      setAudioError(null);
      return;
    }
    
    // Determine the actual audio URL to use
    let actualAudioUrl = "";
    
    if (chunkedData && chunkedData.chunks.length > 0) {
      // Use the current chunk URL
      actualAudioUrl = chunkedData.chunks[currentChunk] || chunkedData.chunks[0];
      console.log(`🎯 Loading chunk ${currentChunk + 1}/${chunkedData.totalChunks}:`);
      console.log(`📍 Chunk URL: ${actualAudioUrl}`);
    } else if (audioUrl && !audioUrl.includes('/chunked?')) {
      // Regular audio URL (not chunked)
      actualAudioUrl = audioUrl;
      console.log('🎵 Loading regular audio URL:', actualAudioUrl);
    } else {
      // No valid audio URL available yet
      console.log('❌ No valid audio URL available');
      setAudioError('Audio will be available when content is ready...');
      return;
    }
    
    // Validate URL format
    if (typeof actualAudioUrl !== 'string' || actualAudioUrl.includes('[object Object]')) {
      console.log('❌ Invalid URL format:', actualAudioUrl);
      setAudioError('Invalid audio URL format. Please try again.');
      return;
    }
    
    // Final validation: ensure we're not trying to play a metadata URL
    if (actualAudioUrl.includes('/chunked?') && !actualAudioUrl.includes('&chunk=')) {
      console.log('❌ Detected metadata URL instead of chunk URL:', actualAudioUrl);
      setAudioError('Invalid audio URL - metadata URL detected. Please retry.');
      return;
    }
    
    console.log('✅ Starting audio setup with validated URL:', actualAudioUrl);
    setAudioError(null);
    setIsLoading(true);
    setLoadingProgress(0);
    
    const setupAudio = async () => {
      try {
        console.log('Setting up audio with URL:', actualAudioUrl);
        
        // Pre-validate the URL to catch any redirects
        console.log('🔍 Pre-validating URL before audio setup...');
        const validationResponse = await fetch(actualAudioUrl, {
          method: 'HEAD', // Just check headers, don't download content
          redirect: 'manual' // Don't follow redirects automatically
        });
        
        console.log('📡 Validation response:', {
          status: validationResponse.status,
          statusText: validationResponse.statusText,
          type: validationResponse.type,
          url: validationResponse.url,
          redirected: validationResponse.redirected
        });
        
        // Handle redirects manually
        if (validationResponse.status >= 300 && validationResponse.status < 400) {
          const location = validationResponse.headers.get('location');
          console.log('🔄 Server returned redirect to:', location);
          
          if (location) {
            console.log('🛠️ Following redirect manually to:', location);
            actualAudioUrl = location;
          } else {
            throw new Error(`Server returned ${validationResponse.status} but no location header`);
          }
        } else if (!validationResponse.ok) {
          throw new Error(`Server returned ${validationResponse.status}: ${validationResponse.statusText}`);
        }
        
        console.log('✅ URL validation complete, proceeding with audio setup');
        
        // Additional wait to ensure any previous audio cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check that we should still proceed (component might have unmounted)
        if (!audioRef.current && actualAudioUrl) {
          console.log('🔧 Creating new audio element after validation');
        } else {
          console.log('⚠️ Audio element already exists or URL invalidated, skipping setup');
          return;
        }
        
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.crossOrigin = 'anonymous';
        audio.volume = volume;
        audio.muted = isMuted;
        
        // Enhanced event handlers
        const onMetadataLoaded = () => {
          console.log('Audio metadata loaded, duration:', audio.duration);
          setDuration(audio.duration);
          
          // For chunked audio, store the duration of this chunk
          if (chunkedData) {
            const newDurations = [...chunkDurations];
            newDurations[currentChunk] = audio.duration;
            setChunkDurations(newDurations);
            
            // Calculate total duration so far
            const totalSoFar = newDurations.reduce((sum, dur) => sum + (dur || 0), 0);
            setTotalDuration(totalSoFar + (chunkedData.totalChunks - newDurations.filter(d => d > 0).length) * 3);
          }
          
          setIsSeekable(audio.duration > 0 && !isNaN(audio.duration));
          setIsLoading(false);
          setLoadingProgress(100);
        };
        
        const onTimeUpdate = () => {
          let adjustedTime = audio.currentTime;
          
          // For chunked audio, add the duration of previous chunks
          if (chunkedData && currentChunk > 0) {
            const previousDuration = chunkDurations.slice(0, currentChunk).reduce((sum, dur) => sum + (dur || 0), 0);
            adjustedTime += previousDuration;
          }
          
          setCurrentTime(adjustedTime);
        };
        
        const onEnded = () => {
          console.log('Audio chunk ended');
          
          // If this is chunked audio and there are more chunks, play the next one
          if (chunkedData && currentChunk < chunkedData.totalChunks - 1) {
            console.log(`Auto-advancing to next chunk: ${currentChunk + 1}/${chunkedData.totalChunks}`);
            setCurrentChunk(prev => prev + 1);
            // Maintain playing state for auto-continuation
            setIsPlaying(true);
            return;
          }
          
          // If it's the last chunk or regular audio, stop playback
          console.log('Reached end of all chunks, stopping playback');
          setIsPlaying(false);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
        
        const onCanPlay = () => {
          console.log('Audio ready to play');
          setIsLoading(false);
          setLoadingProgress(100);
          
          // Auto-start next chunk if we're in the middle of playing chunked audio
          if (chunkedData && isPlaying) {
            console.log(`Auto-starting chunk ${currentChunk + 1} to maintain playback continuity`);
            setTimeout(() => {
              if (audioRef.current && audioRef.current === audio) {
                audio.play().catch(error => {
                  console.error('Failed to auto-play next chunk:', error);
                  setAudioError('Failed to continue playback. Please try again.');
                  setIsPlaying(false);
                });
              }
            }, 100); // Small delay to ensure audio is fully ready
          }
        };
        
        const onPlaying = () => {
          console.log('Audio started playing');
          setAudioError(null);
          setIsLoading(false);
          setLoadingProgress(100);
          
          // Ensure the play state is correctly set when audio actually starts playing
          setIsPlaying(true);
          
          // Ensure animation frame is running for continuous time updates
          if (!animationRef.current) {
            animationRef.current = requestAnimationFrame(whilePlaying);
          }
        };
        
        const onPause = () => {
          console.log('Audio paused');
          // Only set playing state to false if it's not an automatic chunk transition
          if (!chunkedData || currentChunk === chunkedData.totalChunks - 1) {
            setIsPlaying(false);
          }
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = undefined;
          }
        };
        
        const onWaiting = () => {
          console.log('Audio buffering...');
          setIsLoading(true);
        };
        
        const onCanPlayThrough = () => {
          console.log('Audio can play through without interruption');
          setIsLoading(false);
          setLoadingProgress(100);
        };
        
        const onProgress = () => {
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const bufferProgress = (bufferedEnd / audio.duration) * 100;
            if (bufferProgress > loadingProgress) {
              setLoadingProgress(Math.min(bufferProgress, 100));
            }
          }
        };
        
        const onError = (e: Event) => {
          // Ignore errors from old audio elements that are no longer current
          if (audioRef.current !== audio) {
            console.log('🗑️ Ignoring error from old audio element (not current)');
            return;
          }
          
          console.error('💥 Audio error event:', e);
          console.log('🔍 Error context:', {
            audioSrc: audio.src,
            currentTime: audio.currentTime,
            duration: audio.duration,
            readyState: audio.readyState,
            networkState: audio.networkState,
            currentChunk: chunkedData ? currentChunk : 'N/A',
            totalChunks: chunkedData ? chunkedData.totalChunks : 'N/A',
            isCurrentAudioRef: audioRef.current === audio
          });
          
          setIsLoading(false);
          setIsPlaying(false);
          
          let errorMessage = 'Failed to load audio. ';
          
          if (audio.error) {
            console.error('🚨 Audio error details:', {
              code: audio.error.code,
              message: audio.error.message,
              MEDIA_ERR_ABORTED: audio.error.MEDIA_ERR_ABORTED,
              MEDIA_ERR_NETWORK: audio.error.MEDIA_ERR_NETWORK,
              MEDIA_ERR_DECODE: audio.error.MEDIA_ERR_DECODE,
              MEDIA_ERR_SRC_NOT_SUPPORTED: audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED
            });
            
            switch (audio.error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage += 'Playback was aborted.';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage += 'Network error occurred.';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage += 'Audio decoding failed.';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage += 'Audio format not supported.';
                console.log('🔍 SRC_NOT_SUPPORTED - Current audio src:', audio.src);
                break;
              default:
                errorMessage += audio.error.message || 'Unknown error occurred.';
            }
          } else {
            console.log('🤔 No audio.error object available');
            // If no error details available, it might be a cleanup-related error
            errorMessage = 'Audio element was reset during chunk transition.';
          }
          
          // Add retry suggestion for chunked audio
          if ((isChunked || chunkedData) && retryCount < 2) {
            errorMessage += ' This is chunked audio - retrying might help.';
          }
          
          console.log('📋 Final error message:', errorMessage);
          setAudioError(errorMessage);
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
        
        // Add all event listeners
        audio.addEventListener('loadedmetadata', onMetadataLoaded);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('canplaythrough', onCanPlayThrough);
        audio.addEventListener('progress', onProgress);
        audio.addEventListener('error', onError);
        
        audioRef.current = audio;
        
        // Set source and start loading with detailed tracking
        console.log('🔧 Setting audio.src to:', actualAudioUrl);
        audio.src = actualAudioUrl;
        console.log('🔍 Immediate check - audio.src is now:', audio.src);
        
        // Add a property observer to track any changes to src
        let lastSrc = audio.src;
        const srcChecker = setInterval(() => {
          if (audio.src !== lastSrc) {
            console.log('🚨 ALERT: audio.src changed unexpectedly!');
            console.log('🔍 Old src:', lastSrc);
            console.log('🔍 New src:', audio.src);
            console.log('🔍 Expected src:', actualAudioUrl);
            lastSrc = audio.src;
            
            // If the src changed to something unexpected, fix it
            if (audio.src !== actualAudioUrl && actualAudioUrl) {
              console.log('🛠️ Fixing corrupted src back to expected URL');
              audio.src = actualAudioUrl;
            }
          }
        }, 100);
        
        // Clean up the checker after a reasonable time
        setTimeout(() => {
          clearInterval(srcChecker);
        }, 5000);
        
        console.log('🚀 Starting audio.load()');
        audio.load();
        console.log('🔍 After load() - audio.src is:', audio.src);
        
        return () => {
          console.log('Cleaning up enhanced audio element');
          audio.removeEventListener('loadedmetadata', onMetadataLoaded);
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('playing', onPlaying);
          audio.removeEventListener('pause', onPause);
          audio.removeEventListener('waiting', onWaiting);
          audio.removeEventListener('canplaythrough', onCanPlayThrough);
          audio.removeEventListener('progress', onProgress);
          audio.removeEventListener('error', onError);
          
          audio.pause();
          audio.src = '';
          audioRef.current = null;
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
        
      } catch (err) {
        console.error('Error setting up audio:', err);
        setAudioError('Failed to initialize audio player. Please try again.');
        setIsLoading(false);
      }
    };
    
    setupAudio();
  }, [audioUrl, volume, isMuted, retryCount, chunkedData, currentChunk]);

  // Add effect to trigger audio setup only when chunked data is ready
  useEffect(() => {
    // If we have a chunked URL but no chunked data yet, don't set up audio
    if (audioUrl && audioUrl.includes('/chunked?') && !chunkedData) {
      console.log('Chunked URL detected, waiting for metadata...');
      setIsLoading(true);
      setAudioError(null);
      return;
    }
    
    // If we have chunked data, the main audio setup effect will handle it
    if (chunkedData) {
      console.log('Chunked data available, audio setup will proceed');
      setIsLoading(false);
    }
  }, [audioUrl, chunkedData]);

  // Handle chunk transition for continuous playback
  useEffect(() => {
    if (chunkedData && currentChunk > 0 && isPlaying) {
      console.log(`Chunk transition: Now on chunk ${currentChunk + 1}/${chunkedData.totalChunks}`);
      // The audio setup effect will handle loading the new chunk
      // This effect ensures we maintain the playing state during transition
      
      // Ensure the play button state is maintained during transition
      setTimeout(() => {
        if (isPlaying && audioRef.current) {
          console.log('🔄 Ensuring play state is maintained during chunk transition');
          setIsPlaying(true);
        }
      }, 150); // After the audio setup delay
    }
  }, [currentChunk, chunkedData, isPlaying]);

  // Enhanced playback controls
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) {
      console.log('No audio element available for playback control');
      return;
    }

    if (isPlaying) {
      console.log('Pausing audio playback');
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    } else {
      console.log('Starting audio playback...');
      if (chunkedData) {
        console.log(`Playing chunk ${currentChunk + 1}/${chunkedData.totalChunks}`);
      }
      setAudioError(null);
      
      audio.play().catch(error => {
        console.error('Playback failed:', error);
        setAudioError('Failed to play audio. Please try again.');
        setIsPlaying(false);
        return;
      });
      
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(whilePlaying);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const whilePlaying = () => {
    if (audioRef.current) {
      // The time update event handler already calculates the adjusted time
      animationRef.current = requestAnimationFrame(whilePlaying);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      
      // For chunked audio, we might need to go to the previous chunk
      if (chunkedData && newTime <= 0 && currentChunk > 0) {
        setCurrentChunk(prev => prev - 1);
        // The new chunk will start at the end minus 10 seconds
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.duration - 10);
          }
        }, 100);
      } else {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
      
      // For chunked audio, we might need to go to the next chunk
      if (chunkedData && newTime >= audioRef.current.duration && currentChunk < chunkedData.totalChunks - 1) {
        setCurrentChunk(prev => prev + 1);
        // The new chunk will start at 10 seconds
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 10;
          }
        }, 100);
      } else {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  // Enhanced seek functionality
  const onSeek = (value: number[]) => {
    if (!audioRef.current || !isSeekable) return;
    
    const targetTime = value[0];
    
    if (chunkedData) {
      // For chunked audio, find which chunk this time belongs to
      let accumulatedTime = 0;
      let targetChunk = 0;
      let targetChunkTime = targetTime;
      
      for (let i = 0; i < chunkDurations.length; i++) {
        const chunkDuration = chunkDurations[i] || 3; // Estimate 3 seconds if unknown
        if (accumulatedTime + chunkDuration > targetTime) {
          targetChunk = i;
          targetChunkTime = targetTime - accumulatedTime;
          break;
        }
        accumulatedTime += chunkDuration;
      }
      
      if (targetChunk !== currentChunk) {
        setCurrentChunk(targetChunk);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = targetChunkTime;
          }
        }, 100);
      } else {
        audioRef.current.currentTime = targetChunkTime;
      }
    } else {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const onVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Retry functionality
  const retryAudio = () => {
    console.log('Retrying audio load...');
    setRetryCount(prev => prev + 1);
    setAudioError(null);
    setIsLoading(true);
    setLoadingProgress(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Enhanced loading state
  if (!isVisible) return null;
  
  if (audioLoading) {
    return (
      <div className="fixed bottom-4 left-20 w-[calc(100vw-450px)] bg-[#FAF7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 shadow-lg z-50 rounded-lg flex justify-center items-center" style={{height: '80px'}}>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4B8A]"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Preparing audio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-20 w-[calc(100vw-450px)] bg-[#FAF7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 shadow-lg z-50 rounded-lg transform transition-transform duration-300 ease-in-out ${isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      
      {/* Loading progress for chunked audio */}
      {isLoading && (isChunked || chunkedData) && (chunkCount > 1 || (chunkedData && chunkedData.totalChunks > 1)) && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              Loading chunked audio {chunkedData ? `(${chunkedData.totalChunks} parts)` : `(${chunkCount} parts)`}
              {chunkedData && ` - Chunk ${currentChunk + 1}/${chunkedData.totalChunks}`}
            </span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <Progress value={loadingProgress} className="h-1" />
        </div>
      )}
      
      {/* Error display with retry option */}
      {audioError && (
        <div className="flex items-center justify-between text-red-500 text-sm mb-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{audioError}</span>
          </div>
          {retryCount < 3 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={retryAudio}
              className="text-red-600 hover:text-red-700 h-6 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}
      
      {/* Audio info */}
      <div className="text-xs text-gray-400 mb-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Headphones className="h-3 w-3" />
          <span className="font-medium">{title}</span>
          {(isChunked || chunkedData) && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">
              {chunkedData ? `${chunkedData.totalChunks} chunks` : `${chunkCount} chunks`}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-5 w-5 text-gray-400 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Main controls */}
      <div className="flex items-center gap-2">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={skipBackward}
            disabled={!isSeekable}
            className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7 disabled:opacity-50"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayPause}
            disabled={isLoading || !!audioError}
            className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={skipForward}
            disabled={!isSeekable}
            className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7 disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1">
            <Slider
              defaultValue={[0]}
              value={[currentTime]}
              max={chunkedData ? totalDuration : (duration || 100)}
              step={0.1}
              onValueChange={onSeek}
              disabled={!isSeekable}
              className={`cursor-pointer h-3 ${!isSeekable ? 'opacity-50' : ''}`}
            />
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
            {formatTime(chunkedData ? totalDuration : duration)}
          </span>
        </div>
        
        {/* Volume controls */}
        <div className="flex items-center gap-1 w-24">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1">
            <Slider
              defaultValue={[0.7]}
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={onVolumeChange}
              className="cursor-pointer h-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Headphones } from "lucide-react";

interface AudioPlayerProps {
  isVisible: boolean;
  onClose: () => void;
  contentTitle?: string; // NEW: dynamic content title
  audioData?: {
    audioUrl: string;
  };
  audioLoading?: boolean;
  contentId?: string;
  youtubeId?: string;
}

export function AudioPlayer({ isVisible, onClose, contentTitle, audioData, audioLoading, contentId, youtubeId }: AudioPlayerProps) {
  // Use contentTitle if provided, otherwise fallback
  const title = contentTitle || "Lecture Audio";
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Debug the audio data
  useEffect(() => {
    console.log('AudioPlayer received audioData:', audioData);
  }, [audioData]);

  // Use real audio URL if available, otherwise set to empty string
  // The URL should already be proxied from the backend
  const audioUrl = audioData?.audioUrl || "";
  
  // Log the audio URL for debugging
  useEffect(() => {
    if (audioUrl) {
      console.log('Using audio URL:', audioUrl);
    } else {
      console.log('No audio URL available yet, waiting for data');
    }
  }, [audioUrl]);
  
  // For debugging - attempt to fetch the URL directly to verify it works
  useEffect(() => {
    if (audioUrl && audioUrl.startsWith('/api/proxy/audio')) {
      console.log('Testing proxy URL:', audioUrl);
      fetch(audioUrl)
        .then(response => {
          console.log('Proxy URL test response:', response.status, response.statusText);
          console.log('Content-Type:', response.headers.get('Content-Type'));
        })
        .catch(error => {
          console.error('Error testing proxy URL:', error);
        });
    }
  }, [audioUrl]);

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

  useEffect(() => {
    // Clean up previous audio instance
    if (audioRef.current) {
      // Stop playback and remove event listeners before creating a new instance
      audioRef.current.pause();
      audioRef.current.src = '';
      
      // Cancel any pending animation frames
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      
      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Clear the reference
      audioRef.current = null;
    }
    
    if (!audioUrl) {
      setAudioError('Audio will be available when content is ready...');
      return;
    }
    
    // Validate URL to catch [object Object] issues early
    if (typeof audioUrl !== 'string') {
      setAudioError('Invalid audio URL format. Please try again.');
      return;
    }
    
    if (audioUrl.includes('[object Object]') || audioUrl.includes('%5Bobject%20Object%5D')) {
      setAudioError('Invalid audio URL format. Please try again.');
      return;
    }
    
    // Set up audio with URL
    setAudioError(null); // Clear any previous errors when trying a new URL
    
    try {
      // Create new audio element with better error handling
      const audio = new Audio();
      
      // Configure audio element for optimal performance
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous'; // Handle CORS issues
      audio.volume = volume;
      audio.muted = isMuted;
      
      // Set the source AFTER adding event listeners to catch all events properly
      // This is important because some browsers trigger events immediately when src is set
      
      // Named event listener functions for proper cleanup
      const onMetadataLoaded = () => {
        console.log('Audio metadata loaded successfully, duration:', audio.duration);
        setDuration(audio.duration);
      };
      
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const onEnded = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      const onCanPlay = () => {
        console.log('Audio can now be played');
      };
      
      const onPlaying = () => {
        console.log('Audio is now playing');
        setAudioError(null); // Clear error if playback starts successfully
      };
      
      // Improved error handling with specific error code detection and fallback options
      const onError = (e: Event) => {
        console.error('Audio element error event:', e);
        
        // Check if we should try a different format or approach
        const tryAlternativeSource = () => {
          // For format errors, try appending a format parameter to force MP3
          if (audioUrl && !audioUrl.includes('&format=mp3')) {
            const newUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}format=mp3&_t=${Date.now()}`;
            console.log('Trying alternative audio format with URL:', newUrl);
            audio.src = newUrl;
            audio.load();
            return true;
          }
          return false;
        };
        
        let errorMessage = 'Failed to play audio. Please try again.';
        
        if (audio.error) {
          // Log detailed error information
          console.error('Audio error code:', audio.error.code);
          console.error('Audio error message:', audio.error.message);
          
          // Provide specific error messages based on error codes
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted by the user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error while loading audio. Please try again.';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio decoding error. Please try again.';
              // Try alternative format for decode errors
              if (tryAlternativeSource()) {
                return; // Don't set error message if we're trying a fallback
              }
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported.';
              // Try alternative format for format errors
              if (tryAlternativeSource()) {
                return; // Don't set error message if we're trying a fallback
              }
              break;
            default:
              errorMessage = `Audio error: ${audio.error.message || 'Unknown error'}`;
              // Try alternative as a last resort
              if (tryAlternativeSource()) {
                return;
              }
          }
        }
        
        // Set the error message for display
        setAudioError(errorMessage);
        
        // Stop playback on error
        audio.pause();
        setIsPlaying(false);
        
        // Cancel any animation frame to stop seeking updates
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      // Set up all event listeners
      audio.addEventListener('loadedmetadata', onMetadataLoaded);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('error', onError);
      
      // Set audio reference first so error handlers can access it
      audioRef.current = audio;
      
      // Set the source LAST - this can trigger immediate events in some browsers
      console.log('Setting audio source to:', audioUrl);
      audio.src = audioUrl;
      
      // Start loading the audio
      audio.load();
      
      // Clean up function to remove event listeners
      return () => {
        console.log('Cleaning up audio element');
        // Remove all event listeners with named functions
        audio.removeEventListener('loadedmetadata', onMetadataLoaded);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('error', onError);
        
        // Stop and clear audio
        audio.pause();
        audio.src = '';
        
        audioRef.current = null;
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (err) {
      console.error('Error creating audio element:', err);
      setAudioError('Failed to initialize audio player. Please try again.');
    }
  }, [audioUrl, volume, isMuted]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Log the current audio source before playing
      console.log('Playing audio from URL:', audio.src);
      
      // Clear any previous errors
      setAudioError(null);
      
      // Try to play and catch any errors
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setAudioError('Failed to play audio. Please try again.');
        setIsPlaying(false);
      });
      
      animationRef.current = requestAnimationFrame(whilePlaying);
    }
    setIsPlaying(!isPlaying);
  };

  const whilePlaying = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(whilePlaying);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration,
        audioRef.current.currentTime + 10
      );
    }
  };

  const onSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
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

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!isVisible) return null;
  
  if (audioLoading) {
    return (
      <div className="fixed bottom-4 left-20 w-[calc(100vw-450px)] bg-[#FAF7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 shadow-lg z-50 rounded-lg flex justify-center items-center" style={{height: '80px'}}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B4B8A]"></div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-20 w-[calc(100vw-450px)] bg-[#FAF7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 shadow-lg z-50 rounded-lg transform transition-transform duration-300 ease-in-out ${isVisible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      {/* We use the Audio API directly instead of an audio element in the DOM */}
      
      {/* Display any audio errors */}
      {audioError && (
        <div className="text-red-500 text-sm mb-2">{audioError}</div>
      )}
      
      {/* Debug info - remove in production */}
      <div className="text-xs text-gray-400 mb-1 max-w-full overflow-hidden text-ellipsis">

      </div>
      
      <div className="w-full mx-auto flex flex-col space-y-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              {/* Headphones icon from lucide-react */}
              <Headphones className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium text-sm text-gray-900 dark:text-white">{title}</h3>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipBackward}
              className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePlayPause}
              className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={skipForward}
              className="text-gray-700 dark:text-gray-300 hover:text-[#5B4B8A] dark:hover:text-white h-7 w-7"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            
            <div className="flex-1">
              <Slider
                defaultValue={[0]}
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={onSeek}
                className="cursor-pointer h-3"
              />
            </div>
            
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>
          
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
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";

interface AudioPlayerProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  audioData?: {
    audioUrl: string;
  };
  audioLoading?: boolean;
  contentId?: string;
  youtubeId?: string;
}

export function AudioPlayer({ isVisible, onClose, title = "Lecture Audio", audioData, audioLoading, contentId, youtubeId }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Use real audio URL if available, otherwise fallback to sample
  const audioUrl = audioData?.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

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
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    // Events
    audio.addEventListener('loadeddata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    // Cleanup
    return () => {
      audio.removeEventListener('loadeddata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      audio.play();
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
    <div className="fixed bottom-4 left-20 w-[calc(100vw-450px)] bg-[#FAF7F8] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 shadow-lg z-50 rounded-lg">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="w-full mx-auto flex flex-col space-y-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                <rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
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

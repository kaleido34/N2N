"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

interface AudioData {
  audioUrl: string;
  transcript: TranscriptSegment[];
}

export default function AudioPage() {
  const router = useRouter();
  const { id } = useParams();
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAudioData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/contents?id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch audio data");
        const data = await res.json();
        setAudioData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audio");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudioData();
  }, [id]);

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
      
      // Find active segment
      const currentSegment = audioData?.transcript.findIndex(
        segment => 
          audio.currentTime >= segment.offset && 
          audio.currentTime < segment.offset + segment.duration
      );
      
      if (currentSegment !== undefined && currentSegment !== activeSegment) {
        setActiveSegment(currentSegment);
        // Scroll to active segment
        const segmentElement = document.getElementById(`segment-${currentSegment}`);
        if (segmentElement && scrollRef.current) {
          segmentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioData, activeSegment]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleSegmentClick = (offset: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = offset;
      setCurrentTime(offset);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-background">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{color: '#5B4B8A'}}>Audio Player</h1>
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
        ) : audioData ? (
          <div className="space-y-6">
            {/* Audio Player */}
            <Card className="p-6">
              <audio
                ref={audioRef}
                src={audioData.audioUrl}
                className="hidden"
              />
              
              {/* Playback Controls */}
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayPause}
                  className="text-[#5B4B8A]"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
                
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Volume Controls */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMuteToggle}
                  className="text-[#5B4B8A]"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-32"
                />
              </div>
            </Card>

            {/* Transcript */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4" style={{color: '#5B4B8A'}}>
                Transcript
              </h2>
              <ScrollArea
                ref={scrollRef}
                className="h-[calc(100vh-400px)]"
              >
                <div className="space-y-2">
                  {audioData.transcript.map((segment, index) => (
                    <div
                      key={index}
                      id={`segment-${index}`}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        activeSegment === index
                          ? 'bg-[#5B4B8A] text-white'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSegmentClick(segment.offset)}
                    >
                      <div className="flex items-start space-x-4">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatTime(segment.offset)}
                        </span>
                        <p className="text-sm">{segment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
} 
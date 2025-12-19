'use client';

import { useEffect, useRef, useState } from 'react';
import type { Slide } from '@/lib/supabase/types';

interface VideoSlideProps {
  slide: Slide;
  onVideoEnd?: () => void;
}

export default function VideoSlide({ slide, onVideoEnd }: VideoSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loopCount, setLoopCount] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);

  const maxLoops = slide.loop_count ?? null; // null = infinite
  const videoUrl = slide.video_url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Reset when slide changes
    setLoopCount(0);
    setHasEnded(false);
    video.currentTime = 0;
    video.load();

    const handleEnded = () => {
      if (maxLoops === null) {
        // Infinite loop - restart immediately
        video.currentTime = 0;
        video.play().catch(console.error);
      } else {
        const newLoopCount = loopCount + 1;
        setLoopCount(newLoopCount);
        
        if (newLoopCount < maxLoops) {
          // More loops to go
          video.currentTime = 0;
          video.play().catch(console.error);
        } else {
          // All loops completed
          setHasEnded(true);
          // Small delay before calling onVideoEnd to ensure video is fully stopped
          setTimeout(() => {
            if (onVideoEnd) {
              onVideoEnd();
            }
          }, 100);
        }
      }
    };

    video.addEventListener('ended', handleEnded);

    // Start playing
    video.play().catch(err => {
      console.error('Error playing video:', err);
    });

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.pause();
      video.currentTime = 0;
    };
  }, [slide.id, videoUrl, maxLoops, loopCount, onVideoEnd]);

  if (!videoUrl) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-white text-xl">No video configured for video slide</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      
      {/* Optional: Show loop count indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && maxLoops !== null && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 text-xs font-mono">
          Loop: {loopCount + 1} / {maxLoops}
        </div>
      )}
    </div>
  );
}

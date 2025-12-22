'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '@/lib/supabase/types';

interface RotatingBackgroundProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  slides: Slide[];
  currentSlide?: Slide; // Direct slide if provided
  disableInternalOverlay?: boolean; // Disable internal overlay when global overlay is active
}

export default function RotatingBackground({ activeIndex, onIndexChange, slides, currentSlide: directSlide, disableInternalOverlay = false }: RotatingBackgroundProps) {
  const [showChannelChange, setShowChannelChange] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const channelChangeTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const channelChangeStartTimeRef = useRef<number | null>(null);
  const iframeLoadedRef = useRef<boolean>(false);

  // Get city index safely
  const getCityIndex = (index: number): number => {
    if (slides.length === 0) return 0;
    return index % slides.length;
  };

  // Limpiar efecto cuando llegamos a una ciudad - esperar a que el iframe cargue
  useEffect(() => {
    iframeLoadedRef.current = false;
    
    if (showChannelChange) {
      const minDisplayTime = 2500;
      
      if (channelChangeStartTimeRef.current) {
        const elapsed = Date.now() - channelChangeStartTimeRef.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        const timer = setTimeout(() => {
          setShowChannelChange(false);
          channelChangeStartTimeRef.current = null;
        }, Math.max(remaining, 500));
        
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setShowChannelChange(false);
        }, minDisplayTime);
        return () => clearTimeout(timer);
      }
    }
  }, [activeIndex, showChannelChange]);

  // Handle transitions when activeIndex changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const prevIndex = activeIndexRef.current;
    const isFirstLoad = prevIndex === undefined || prevIndex === activeIndex;
      
    if (!isFirstLoad && !disableInternalOverlay) {
      channelChangeStartTimeRef.current = Date.now();
      setShowChannelChange(true);
      
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (channelChangeTimerRef.current) clearTimeout(channelChangeTimerRef.current);
      
      const cleanupDelay = 3000;
      channelChangeTimerRef.current = setTimeout(() => {
        if (!iframeLoadedRef.current) {
          const extendedTimer = setTimeout(() => {
            setShowChannelChange(false);
            channelChangeStartTimeRef.current = null;
          }, 2000);
          channelChangeTimerRef.current = extendedTimer;
          return;
        }
        setShowChannelChange(false);
        channelChangeStartTimeRef.current = null;
      }, cleanupDelay);
    } else if (disableInternalOverlay) {
      // If global overlay is active, ensure internal overlay is hidden
      setShowChannelChange(false);
      channelChangeStartTimeRef.current = null;
    }
    
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Use direct slide if provided, otherwise calculate from slides array
  const cityIndex = getCityIndex(activeIndex);
  const currentSlide = directSlide || slides[cityIndex];

  // Handler para detectar cuando el iframe ha cargado
  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    
    if (showChannelChange && !disableInternalOverlay) {
      setTimeout(() => {
        setShowChannelChange(false);
        channelChangeStartTimeRef.current = null;
      }, 500);
    }
  };

  // Handler para errores del iframe
  const handleIframeError = () => {
    // Error cargando iframe - silently handle
  };

  // Don't render if no slides
  if (!currentSlide || !currentSlide.youtube_url) {
    return (
      <div className="youtube-container flex items-center justify-center bg-black">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // Determine zoom class based on slide name
  const getZoomClass = () => {
    const name = currentSlide.name.toLowerCase();
    if (name === 'necochea' || name === 'sydney') return 'necochea-zoom';
    if (name === 'hong kong') return 'hongkong-zoom';
    return '';
  };

  return (
    <>
      {/* Contenedor principal */}
      <div className="youtube-container">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`city-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: showChannelChange ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <iframe
              key={`${activeIndex}-${currentSlide.name}`}
              ref={iframeRef}
              src={currentSlide.youtube_url}
              className={`youtube-iframe ${getZoomClass()}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Efecto de cambio de canal */}
      {showChannelChange && (
        <div className="channel-change-overlay">
          <div className="tv-static"></div>
          <div className="interference-lines"></div>
          <div className="channel-change-text">SWITCHING FEED...</div>
        </div>
      )}
    </>
  );
}

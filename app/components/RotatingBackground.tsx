'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES, ROTATION_SECONDS } from '@/config/cities';
import Image from 'next/image';

interface RotatingBackgroundProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export default function RotatingBackground({ activeIndex, onIndexChange }: RotatingBackgroundProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Limpiar timers anteriores
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);

    intervalRef.current = setInterval(() => {
      // 1. Activar overlay para tapar el loading
      setShowOverlay(true);
      
      // 2. Después de 1 segundo, cambiar la cámara
      overlayTimerRef.current = setTimeout(() => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        onIndexChange(nextIndex);
        
        // 3. Mantener overlay por 1.5 segundos más para asegurar que la nueva cámara esté lista
        setTimeout(() => {
          setShowOverlay(false);
        }, 1500);
      }, 1000);
    }, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [activeIndex, onIndexChange]);

  const currentCity = CITIES[activeIndex];

  return (
    <div className="youtube-container">
      {/* Overlay de transición que tapa el loading */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="transition-overlay"
          >
            <div className="overlay-content">
              <div className="logo-container">
                <Image
                  src="/isortv.png"
                  alt="ISOR TV"
                  width={200}
                  height={100}
                  className="overlay-logo"
                />
              </div>
              <div className="loading-indicator">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido de YouTube */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: showOverlay ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full"
        >
          <iframe
            src={currentCity.ytLiveUrl}
            className="youtube-iframe"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

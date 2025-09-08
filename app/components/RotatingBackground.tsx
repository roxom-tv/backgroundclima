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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Limpiar timers anteriores
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);

    intervalRef.current = setInterval(() => {
      // 1. Activar efecto de televisión (lluvia caótica y random)
      console.log('🎬 Activando efecto de TV...');
      setShowOverlay(true);
      setIsVideoLoaded(false);
      
      // 2. Después de 1.25 segundos, cambiar la cámara
      overlayTimerRef.current = setTimeout(() => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        console.log('🔄 Cambiando a ciudad:', nextIndex);
        onIndexChange(nextIndex);
      }, 1250);
    }, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [activeIndex, onIndexChange]);

  // Efecto para manejar la carga del video
  useEffect(() => {
    if (showOverlay && isVideoLoaded) {
      console.log('✅ Video cargado, desactivando efecto de TV...');
      setShowOverlay(false);
    }
  }, [showOverlay, isVideoLoaded]);

  const currentCity = CITIES[activeIndex];

  // Handler para detectar cuando el iframe ha cargado
  const handleIframeLoad = () => {
    console.log('📺 Iframe cargado completamente');
    setIsVideoLoaded(true);
  };

  console.log('🎬 Estado del overlay:', showOverlay, 'Video cargado:', isVideoLoaded);

  return (
    <div className="youtube-container">
      {/* Efecto de Televisión (Lluvia Caótica y Random) */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2.5,
              ease: "easeInOut"
            }}
            className="glitch-overlay"
          >
            <div className="glitch-effect"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido de YouTube */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: showOverlay ? 0 : 1
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.4,
            ease: "easeInOut"
          }}
          className="w-full h-full"
        >
          <iframe
            ref={iframeRef}
            src={currentCity.ytLiveUrl}
            className={`youtube-iframe ${currentCity.name === 'Necochea' ? 'necochea-zoom' : ''}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onLoad={handleIframeLoad}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

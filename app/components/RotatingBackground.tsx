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
  const [showOverlay, setShowOverlay] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [useSimpleFallback, setUseSimpleFallback] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showChannelChange, setShowChannelChange] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const channelChangeTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeIndexRef = useRef(activeIndex);

  // Detectar si el navegador soporta características modernas
  useEffect(() => {
    const supportsModernFeatures = () => {
      // Verificar soporte para CSS Grid, Flexbox, y animaciones complejas
      const testEl = document.createElement('div');
      const style = testEl.style;
      
      // Verificar soporte para linear-gradient
      style.background = 'linear-gradient(45deg, #000, #fff)';
      const hasGradient = style.background.includes('gradient');
      
      // Verificar soporte para animaciones
      const hasAnimations = 'animation' in style || 'webkitAnimation' in style;
      
      // Verificar soporte para viewport units
      style.width = '100vw';
      const hasViewportUnits = style.width === '100vw';
      
      return hasGradient && hasAnimations && hasViewportUnits;
    };

    setUseSimpleFallback(!supportsModernFeatures());
  }, []);

  useEffect(() => {
    // Limpiar timers anteriores
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (channelChangeTimerRef.current) clearTimeout(channelChangeTimerRef.current);

    // Función para ejecutar transición con efecto de cambio de canal
    const executeTransition = () => {
      // 1. Activar el efecto de cambio de canal
      console.log('Iniciando efecto de cambio de canal');
      setShowChannelChange(true);
      setIsTransitioning(true);
      setAnimationKey(prev => prev + 1);
      
      // 2. Después de 0.5 segundos, cambiar la cámara
      overlayTimerRef.current = setTimeout(() => {
        const nextIndex = (activeIndexRef.current + 1) % CITIES.length;
        console.log('Cambiando a cámara:', nextIndex);
        onIndexChange(nextIndex);
      }, 500);
      
      // 3. Después de 1.8 segundos total, finalizar el efecto
      channelChangeTimerRef.current = setTimeout(() => {
        console.log('Finalizando efecto de cambio de canal');
        setShowChannelChange(false);
        setIsTransitioning(false);
      }, 1800);
    };

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (channelChangeTimerRef.current) clearTimeout(channelChangeTimerRef.current);
    };
  }, []); // Sin dependencias para evitar re-ejecuciones

  // Actualizar la referencia del activeIndex
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const currentCity = CITIES[activeIndex];

  // Handler para detectar cuando el iframe ha cargado
  const handleIframeLoad = () => {
    // Iframe cargado correctamente
  };

  // Handler para errores del iframe
  const handleIframeError = () => {
    // Error cargando iframe
  };

  return (
    <>
      {/* Capa de videos de YouTube - Siempre visible, nunca muestra preloaders */}
      <div className="youtube-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: isTransitioning ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.4,
              ease: "easeInOut"
            }}
            className="w-full h-full"
          >
            <iframe
              key={`${activeIndex}-${currentCity.name}`}
              ref={iframeRef}
              src={currentCity.ytLiveUrl}
              className={`youtube-iframe ${currentCity.name === 'Necochea' || currentCity.name === 'Sydney' ? 'necochea-zoom' : ''}`}
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

      {/* Efecto de cambio de canal - Ruido blanco y líneas de interferencia */}
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

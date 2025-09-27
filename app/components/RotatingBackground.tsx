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
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const transitionTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Limpiar timers anteriores
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

    // Función para ejecutar la transición
    const executeTransition = () => {
      console.log('🎬 Iniciando transición...');
      
      // 1. Activar efecto de transición inmediatamente
      setShowOverlay(true);
      
      // 2. Después de 0.5 segundos, cambiar la cámara
      overlayTimerRef.current = setTimeout(() => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        console.log('🔄 Cambiando a ciudad:', nextIndex);
        onIndexChange(nextIndex);
      }, 500);
      
      // 3. Después de 3 segundos, desactivar la transición
      transitionTimerRef.current = setTimeout(() => {
        console.log('✅ Transición completada, desactivando efecto...');
        setShowOverlay(false);
      }, 3000);
    };

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [activeIndex, onIndexChange]);

  // Efecto adicional para asegurar que la transición se ejecute cuando cambie el activeIndex
  useEffect(() => {
    // Si el activeIndex cambia y no hay transición activa, ejecutar una transición
    if (!showOverlay) {
      console.log('🔄 Cambio de ciudad detectado, ejecutando transición...');
      setShowOverlay(true);
      
      // Desactivar después de 3 segundos
      const timer = setTimeout(() => {
        console.log('✅ Transición por cambio de ciudad completada');
        setShowOverlay(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [activeIndex, showOverlay]);

  const currentCity = CITIES[activeIndex];

  // Handler para detectar cuando el iframe ha cargado (opcional, para logging)
  const handleIframeLoad = () => {
    console.log('📺 Iframe cargado completamente');
  };

  console.log('🎬 Estado del overlay:', showOverlay);

  return (
    <>
      {/* Capa de videos de YouTube - Siempre visible, nunca muestra preloaders */}
      <div className="youtube-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
              className={`youtube-iframe ${currentCity.name === 'Necochea' || currentCity.name === 'Sydney' ? 'necochea-zoom' : ''}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              onLoad={handleIframeLoad}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Capa transparente siempre visible - Se convierte en transición cuando es necesario */}
      <div className={`transition-overlay ${showOverlay ? 'active' : ''}`}>
        <div className="glitch-effect"></div>
      </div>
    </>
  );
}

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
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

    // Función para ejecutar transición completa
    const executeTransition = () => {
      console.log('🎬 Iniciando transición automática...');
      
      // 1. Reiniciar animación y activar efecto de transición INMEDIATAMENTE
      setAnimationKey(prev => prev + 1);
      setShowOverlay(true);
      
      // 2. Después de 0.5 segundos, cambiar la cámara
      overlayTimerRef.current = setTimeout(() => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        console.log('🔄 Cambiando a ciudad:', nextIndex);
        onIndexChange(nextIndex);
      }, 500);
    };

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [activeIndex, onIndexChange]);


  // Efecto simple para desactivar overlay después de 3.5 segundos cuando se activa
  useEffect(() => {
    if (showOverlay) {
      console.log('⏰ Overlay activado, programando desactivación en 3.5 segundos...');
      const timer = setTimeout(() => {
        console.log('✅ Desactivando overlay después de 3.5 segundos');
        setShowOverlay(false);
      }, 3500);
      
      return () => {
        console.log('🧹 Limpiando timer de desactivación');
        clearTimeout(timer);
      };
    }
  }, [showOverlay]);

  const currentCity = CITIES[activeIndex];

  // Handler para detectar cuando el iframe ha cargado (opcional, para logging)
  const handleIframeLoad = () => {
    console.log('📺 Iframe cargado completamente para:', currentCity.name);
  };

  // Handler para errores del iframe
  const handleIframeError = () => {
    console.error('❌ Error cargando iframe para:', currentCity.name, 'URL:', currentCity.ytLiveUrl);
  };

  console.log('🎬 Estado del overlay:', showOverlay);
  console.log('🏙️ Ciudad actual:', currentCity.name, 'Index:', activeIndex);
  console.log('🔗 URL YouTube:', currentCity.ytLiveUrl);

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
              onError={handleIframeError}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Capa transparente siempre visible - Se convierte en transición cuando es necesario */}
      <div className={`transition-overlay ${showOverlay ? 'active' : ''}`}>
        <div 
          key={animationKey} 
          className={`glitch-effect ${useSimpleFallback ? 'simple-fallback' : ''}`}
        ></div>
      </div>

    </>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES, ROTATION_SECONDS } from '@/config/cities';

interface RotatingBackgroundProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

// Solo ciudades, sin placas de mercado
const TOTAL_ITEMS = CITIES.length;

export default function RotatingBackground({ activeIndex, onIndexChange }: RotatingBackgroundProps) {
  const [showChannelChange, setShowChannelChange] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const channelChangeTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const channelChangeStartTimeRef = useRef<number | null>(null);
  const iframeLoadedRef = useRef<boolean>(false);

  // Ahora solo hay ciudades, el índice es directamente el índice de la ciudad
  const getCityIndex = (index: number): number => {
    return index % CITIES.length;
  };

  // Actualizar la referencia del activeIndex
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Limpiar efecto cuando llegamos a una ciudad - esperar a que el iframe cargue
  useEffect(() => {
    iframeLoadedRef.current = false;
    
    // Si hay efecto activo, esperar a que el iframe cargue o un tiempo mínimo
    if (showChannelChange) {
      const minDisplayTime = 2500; // Tiempo mínimo de display del switching feed
      
      if (channelChangeStartTimeRef.current) {
        const elapsed = Date.now() - channelChangeStartTimeRef.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        console.log(`[RotatingBackground] Llegamos a ciudad, tiempo transcurrido: ${elapsed}ms, esperando ${remaining}ms más o hasta que iframe cargue`);
        
        // Esperar el tiempo restante O hasta que el iframe cargue (lo que ocurra primero)
        const timer = setTimeout(() => {
          // Si el iframe ya cargó, limpiar inmediatamente
          if (iframeLoadedRef.current) {
            console.log(`[RotatingBackground] Limpiando efecto - iframe ya cargado`);
          } else {
            console.log(`[RotatingBackground] Limpiando efecto - tiempo mínimo cumplido`);
          }
          setShowChannelChange(false);
          channelChangeStartTimeRef.current = null;
        }, Math.max(remaining, 500)); // Mínimo 500ms
        
        return () => clearTimeout(timer);
      } else {
        // Si no hay timestamp, esperar tiempo mínimo o hasta que iframe cargue
        console.log(`[RotatingBackground] Esperando tiempo mínimo o carga de iframe`);
        const timer = setTimeout(() => {
          setShowChannelChange(false);
        }, minDisplayTime);
        return () => clearTimeout(timer);
      }
    }
  }, [activeIndex, showChannelChange]);

  useEffect(() => {
    // Limpiar solo el intervalo anterior
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Función para ejecutar transición
    const executeTransition = () => {
      const currentIndex = activeIndexRef.current;
      const nextIndex = (currentIndex + 1) % TOTAL_ITEMS;
      
      console.log(`[RotatingBackground] Ejecutando transición desde ciudad ${currentIndex} a ciudad ${nextIndex}`);
      
      // Mostrar efecto de switching feed al cambiar de ciudad
      console.log(`[RotatingBackground] Activando efecto de switching feed`);
      channelChangeStartTimeRef.current = Date.now();
      setShowChannelChange(true);
      
      // Limpiar timers anteriores de esta transición
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (channelChangeTimerRef.current) clearTimeout(channelChangeTimerRef.current);
      
      overlayTimerRef.current = setTimeout(() => {
        console.log(`[RotatingBackground] Cambiando a ciudad ${nextIndex}`);
        onIndexChange(nextIndex);
      }, 500);
      
      // Timer para limpiar el efecto - dar tiempo para que el iframe cargue
      const cleanupDelay = 3000; // Tiempo para que el iframe cargue
      channelChangeTimerRef.current = setTimeout(() => {
        // Verificar que el iframe haya cargado
        if (!iframeLoadedRef.current) {
          console.log(`[RotatingBackground] Iframe aún no cargado, extendiendo switching feed`);
          const extendedTimer = setTimeout(() => {
            console.log(`[RotatingBackground] Limpiando efecto después de extensión`);
            setShowChannelChange(false);
            channelChangeStartTimeRef.current = null;
          }, 2000); // Extender 2 segundos más
          channelChangeTimerRef.current = extendedTimer;
          return;
        }
        console.log(`[RotatingBackground] Limpiando efecto de switching feed después de ${cleanupDelay}ms`);
        setShowChannelChange(false);
        channelChangeStartTimeRef.current = null;
      }, cleanupDelay);
    };

    // Duración para ciudades
    const duration = ROTATION_SECONDS * 1000;

    console.log(`[RotatingBackground] Configurando intervalo para ciudad ${activeIndex} con duración ${duration}ms`);

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, duration);

    return () => {
      // Solo limpiar el intervalo, NO los timers de transición activos
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]); // Depender de activeIndex para recalcular cuando cambie

  const cityIndex = getCityIndex(activeIndex);
  const currentCity = CITIES[cityIndex];

  // Handler para detectar cuando el iframe ha cargado
  const handleIframeLoad = () => {
    console.log(`[RotatingBackground] Iframe cargado correctamente`);
    iframeLoadedRef.current = true;
    
    // Si hay switching feed activo, limpiarlo después de un breve delay
    if (showChannelChange) {
      setTimeout(() => {
        console.log(`[RotatingBackground] Limpiando switching feed después de carga de iframe`);
        setShowChannelChange(false);
        channelChangeStartTimeRef.current = null;
      }, 500); // Pequeño delay para transición suave
    }
  };

  // Handler para errores del iframe
  const handleIframeError = () => {
    // Error cargando iframe
  };

  return (
    <>
      {/* Contenedor principal */}
      <div className="youtube-container">
        <AnimatePresence mode="wait" initial={false}>
          {/* Mostrar video de YouTube */}
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
              key={`${activeIndex}-${currentCity.name}`}
              ref={iframeRef}
              src={currentCity.ytLiveUrl}
              className={`youtube-iframe ${
                currentCity.name === 'Necochea' || currentCity.name === 'Sydney' 
                  ? 'necochea-zoom' 
                  : currentCity.name === 'Hong Kong' 
                  ? 'hongkong-zoom' 
                  : ''
              }`}
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

      {/* Efecto de cambio de canal - Antes de videos y entre ciudades */}
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

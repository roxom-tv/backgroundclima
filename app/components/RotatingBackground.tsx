'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES, ROTATION_SECONDS } from '@/config/cities';
import { MARKET_PLATES, MARKET_PLATE_DURATION } from '@/config/marketPlates';
import { TWELVE_DATA_SYMBOLS } from '@/config/twelveDataSymbols';
import MarketPlate from './MarketPlate';

interface RotatingBackgroundProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

// Calcular total de items: ciudades + placas intercaladas
// Patrón: Ciudad 0, Placa 0, Ciudad 1, Placa 1, ... = 20 items total
const TOTAL_ITEMS = CITIES.length * 2; // 20 items (10 ciudades + 10 placas)

export default function RotatingBackground({ activeIndex, onIndexChange }: RotatingBackgroundProps) {
  const [showChannelChange, setShowChannelChange] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const channelChangeTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const channelChangeStartTimeRef = useRef<number | null>(null);
  const preloadCacheRef = useRef<Map<number, boolean>>(new Map());
  const iframeLoadedRef = useRef<boolean>(false);

  // Determinar si el índice actual es una ciudad o una placa
  const isMarketPlate = (index: number): boolean => {
    // Índices pares (0, 2, 4...) = ciudades
    // Índices impares (1, 3, 5...) = placas
    return index % 2 === 1;
  };

  const getCityIndex = (index: number): number => {
    return Math.floor(index / 2);
  };

  const getMarketPlateIndex = (index: number): number => {
    return Math.floor(index / 2);
  };

  // Actualizar la referencia del activeIndex
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Pre-cargar datos de las placas siguientes
  useEffect(() => {
    const preloadNextPlates = async () => {
      // Pre-cargar las próximas 2 placas de mercado
      for (let i = 1; i <= 4; i++) {
        const futureIndex = (activeIndex + i) % TOTAL_ITEMS;
        if (isMarketPlate(futureIndex)) {
          const plateIndex = getMarketPlateIndex(futureIndex);
          const plate = MARKET_PLATES[plateIndex];
          
          // Verificar si ya pre-cargamos esta placa
          if (preloadCacheRef.current.get(plateIndex)) {
            continue;
          }

          try {
            // Mapear símbolos a Twelve Data
            const symbols = plate.data.map(item => {
              const twelveDataSymbol = TWELVE_DATA_SYMBOLS[item.symbol] || item.symbol;
              return twelveDataSymbol;
            });

            // Pre-cargar datos (esto activará el cache del servidor)
            await fetch(`/api/market-data?symbols=${symbols.join(',')}`);
            preloadCacheRef.current.set(plateIndex, true);
            console.log(`[RotatingBackground] Pre-cargada placa ${plateIndex}`);
          } catch (error) {
            console.warn(`[RotatingBackground] Error pre-cargando placa ${plateIndex}:`, error);
          }
        }
      }
    };

    // Pre-cargar después de un pequeño delay para no interferir con la carga actual
    const preloadTimer = setTimeout(preloadNextPlates, 2000);
    
    return () => clearTimeout(preloadTimer);
  }, [activeIndex]);

  // Limpiar efecto de switching feed cuando llegamos a una placa
  useEffect(() => {
    const currentIsMarket = isMarketPlate(activeIndex);
    // Si llegamos a una placa, limpiar el efecto después de un breve delay
    if (currentIsMarket && showChannelChange) {
      const timer = setTimeout(() => {
        console.log(`[RotatingBackground] Limpiando efecto al llegar a placa`);
        setShowChannelChange(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, showChannelChange]);

  // Limpiar efecto cuando llegamos a una ciudad - esperar a que el iframe cargue
  useEffect(() => {
    const currentIsMarket = isMarketPlate(activeIndex);
    // Si llegamos a una ciudad, resetear el flag de iframe cargado
    if (!currentIsMarket) {
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
    }
  }, [activeIndex, showChannelChange]);

  useEffect(() => {
    // Limpiar solo el intervalo anterior
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Función para ejecutar transición
    const executeTransition = () => {
      const currentIndex = activeIndexRef.current;
      const currentIsMarket = isMarketPlate(currentIndex);
      const nextIndex = (currentIndex + 1) % TOTAL_ITEMS;
      const nextIsMarket = isMarketPlate(nextIndex);
      
      console.log(`[RotatingBackground] Ejecutando transición desde índice ${currentIndex} (${currentIsMarket ? 'PLACA' : 'CIUDAD'}) a ${nextIndex} (${nextIsMarket ? 'PLACA' : 'CIUDAD'})`);
      
      // Mostrar efecto de switching feed cuando:
      // 1. Vamos de ciudad a ciudad
      // 2. Vamos de placa a ciudad (antes de mostrar el video)
      // 3. Vamos de ciudad a placa (para cubrir tiempo de carga)
      if (!currentIsMarket || (currentIsMarket && !nextIsMarket) || (!currentIsMarket && nextIsMarket)) {
        // Mostrar efecto de switching feed
        console.log(`[RotatingBackground] Activando efecto de switching feed`);
        channelChangeStartTimeRef.current = Date.now();
        setShowChannelChange(true);
        
        // Limpiar timers anteriores de esta transición
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        if (channelChangeTimerRef.current) clearTimeout(channelChangeTimerRef.current);
        
        overlayTimerRef.current = setTimeout(() => {
          console.log(`[RotatingBackground] Cambiando a índice ${nextIndex} (${nextIsMarket ? 'PLACA' : 'CIUDAD'})`);
          onIndexChange(nextIndex);
        }, 500);
        
        // Timer para limpiar el efecto
        // Si va a una ciudad, dar más tiempo para que el iframe cargue (3000ms)
        // Si va a una placa, dar tiempo para que carguen los datos (2500ms)
        const cleanupDelay = nextIsMarket ? 2500 : 3000; // Más tiempo si va a una ciudad (iframe tarda más)
        channelChangeTimerRef.current = setTimeout(() => {
          // Si es una ciudad, verificar que el iframe haya cargado
          if (!nextIsMarket) {
            // Dar un poco más de tiempo si el iframe no ha cargado aún
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
          }
          console.log(`[RotatingBackground] Limpiando efecto de switching feed después de ${cleanupDelay}ms`);
          setShowChannelChange(false);
          channelChangeStartTimeRef.current = null;
        }, cleanupDelay);
      } else {
        // Para placas que van a otra placa, mostrar switching feed también
        // para cubrir el tiempo de carga de la nueva placa
        console.log(`[RotatingBackground] Cambiando de placa a placa, mostrando switching feed`);
        channelChangeStartTimeRef.current = Date.now();
        setShowChannelChange(true);
        
        overlayTimerRef.current = setTimeout(() => {
          onIndexChange(nextIndex);
        }, 500);
        
        // Dar tiempo para que la nueva placa cargue
        channelChangeTimerRef.current = setTimeout(() => {
          setShowChannelChange(false);
          channelChangeStartTimeRef.current = null;
        }, 2500);
      }
    };

    // Determinar duración según el tipo actual
    const currentIsMarket = isMarketPlate(activeIndex);
    const duration = currentIsMarket ? MARKET_PLATE_DURATION * 1000 : ROTATION_SECONDS * 1000;

    console.log(`[RotatingBackground] Configurando intervalo para índice ${activeIndex} (${currentIsMarket ? 'PLACA' : 'CIUDAD'}) con duración ${duration}ms`);

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, duration);

    return () => {
      // Solo limpiar el intervalo, NO los timers de transición activos
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]); // Depender de activeIndex para recalcular cuando cambie

  const currentIsMarket = isMarketPlate(activeIndex);
  const cityIndex = getCityIndex(activeIndex);
  const marketIndex = getMarketPlateIndex(activeIndex);
  const currentCity = CITIES[cityIndex];
  const currentPlate = MARKET_PLATES[marketIndex];

  // Handler para detectar cuando el iframe ha cargado
  const handleIframeLoad = () => {
    console.log(`[RotatingBackground] Iframe cargado correctamente`);
    iframeLoadedRef.current = true;
    
    // Si hay switching feed activo y estamos en una ciudad, limpiarlo después de un breve delay
    const currentIsMarket = isMarketPlate(activeIndex);
    if (!currentIsMarket && showChannelChange) {
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
      <div className={currentIsMarket ? "market-container" : "youtube-container"}>
        <AnimatePresence mode="wait" initial={false}>
          {currentIsMarket ? (
            // Mostrar placa de mercado
            <motion.div
              key={`market-${activeIndex}`}
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
              <MarketPlate plate={currentPlate} />
            </motion.div>
          ) : (
            // Mostrar video de YouTube
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
                className={`youtube-iframe ${currentCity.name === 'Necochea' || currentCity.name === 'Sydney' ? 'necochea-zoom' : ''}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </motion.div>
          )}
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

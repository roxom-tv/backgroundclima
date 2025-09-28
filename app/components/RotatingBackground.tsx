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
  const [currentImage, setCurrentImage] = useState<string>('');
  const [nextImage, setNextImage] = useState<string>('');
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const overlayTimerRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Función para capturar imagen del iframe
  const captureIframeImage = async (): Promise<string> => {
    return new Promise((resolve) => {
      // Intentar capturar el contenido del iframe
      if (iframeRef.current) {
        try {
          // Crear un canvas para capturar
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve('');
            return;
          }

          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;

          // Intentar dibujar el iframe en el canvas
          // Nota: Esto puede fallar por restricciones de seguridad CORS
          try {
            // No se puede dibujar un iframe directamente en canvas por restricciones de seguridad
            // Esto siempre fallará, pero lo dejamos como intento
            throw new Error('Iframe capture not supported');
          } catch (error) {
            // No se pudo capturar el iframe directamente, continuar con fallback
          }
        } catch (error) {
          // Error en captura de iframe
        }
      }

      // Fallback: Crear una imagen que simule el contenido actual
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('');
        return;
      }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Crear un fondo que simule el contenido de la cámara actual
      const currentCity = CITIES[activeIndex];
      let bgColor = '#1a1a2e'; // Color por defecto
      
      // Colores diferentes para cada ciudad
      switch (currentCity.name) {
        case 'Hong Kong':
          bgColor = '#2c1810'; // Marrón oscuro
          break;
        case 'London':
          bgColor = '#1a2332'; // Azul grisáceo
          break;
        case 'Necochea':
          bgColor = '#0f2d1a'; // Verde oscuro
          break;
        case 'Sydney':
          bgColor = '#2d1a0f'; // Marrón rojizo
          break;
        default:
          bgColor = '#1a1a2e';
      }

      // Crear un gradiente sutil basado en la ciudad
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
      gradient.addColorStop(0, bgColor);
      gradient.addColorStop(1, '#000000');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Agregar un patrón sutil para simular textura de video
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3;
        ctx.fillRect(x, y, size, size);
      }

      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataURL);
    });
  };

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

    // Función para ejecutar transición completa con morphing
    const executeTransition = async () => {
      // 1. Capturar la imagen actual ANTES de cambiar
      const currentImageData = await captureIframeImage();
      setCurrentImage(currentImageData);
      
      // 2. Activar el estado de transición
      setIsTransitioning(true);
      setShowOverlay(true);
      setAnimationKey(prev => prev + 1);
      
      // 3. Después de 0.5 segundos, cambiar la cámara
      overlayTimerRef.current = setTimeout(async () => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        
        // 4. Cambiar la cámara
        onIndexChange(nextIndex);
        
        // 5. Esperar un poco para que la nueva cámara cargue y capturar
        setTimeout(async () => {
          const nextImageData = await captureIframeImage();
          setNextImage(nextImageData);
        }, 1000);
        
        // 6. Después de 3 segundos, finalizar la transición
        setTimeout(() => {
          setIsTransitioning(false);
          setShowOverlay(false);
          setCurrentImage('');
          setNextImage('');
        }, 3000);
        
      }, 500);
    };

    // Configurar el intervalo principal
    intervalRef.current = setInterval(executeTransition, ROTATION_SECONDS * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [activeIndex, onIndexChange]);



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

      {/* Capa de morphing - Imágenes capturadas que se transforman */}
      {isTransitioning && (
        <div className="morphing-overlay">
          {currentImage && (
            <motion.div
              className="morph-image current-image"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              style={{
                backgroundImage: `url(${currentImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          {nextImage && (
            <motion.div
              className="morph-image next-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
              style={{
                backgroundImage: `url(${nextImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          {/* Efecto de persiana aplicado directamente sobre las imágenes */}
          <div 
            key={animationKey} 
            className={`glitch-effect ${useSimpleFallback ? 'simple-fallback' : ''}`}
          ></div>
        </div>
      )}


    </>
  );
}

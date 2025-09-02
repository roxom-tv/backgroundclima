'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES, ROTATION_SECONDS } from '@/config/cities';

interface RotatingBackgroundProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export default function RotatingBackground({ activeIndex, onIndexChange }: RotatingBackgroundProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // Small delay to allow fade out animation
      setTimeout(() => {
        const nextIndex = (activeIndex + 1) % CITIES.length;
        onIndexChange(nextIndex);
        setIsTransitioning(false);
      }, 300);
    }, ROTATION_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [activeIndex, onIndexChange]);

  const currentCity = CITIES[activeIndex];

  return (
    <div className="youtube-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
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

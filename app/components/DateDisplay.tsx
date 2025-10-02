'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES } from '@/config/cities';

interface DateDisplayProps {
  activeIndex: number;
}

export default function DateDisplay({ activeIndex }: DateDisplayProps) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const currentCity = CITIES[activeIndex];
      const now = new Date();
      
      // Crear fecha en la zona horaria de la ciudad actual
      const localDate = new Intl.DateTimeFormat('en-US', {
        timeZone: currentCity.tz,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }).format(now);
      
      setCurrentDate(localDate);
    };

    updateDate();
    // Solo actualizar cada hora para fechas (no necesitamos actualización por segundo)
    const interval = setInterval(updateDate, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`date-${activeIndex}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="date-display"
      >
        {currentDate}
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateDisplayProps {
  activeIndex: number;
  timezone?: string;
}

export default function DateDisplay({ activeIndex, timezone = 'America/New_York' }: DateDisplayProps) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      
      try {
        // Create date in the city's timezone
        const localDate = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }).format(now);
        
        setCurrentDate(localDate);
      } catch {
        // Fallback to local date if timezone is invalid
        const localDate = new Intl.DateTimeFormat('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }).format(now);
        
        setCurrentDate(localDate);
      }
    };

    updateDate();
    // Update every hour for dates
    const interval = setInterval(updateDate, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, [timezone]);

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

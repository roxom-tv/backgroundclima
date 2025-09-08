'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DateDisplay() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      setCurrentDate(dateString);
    };

    updateDate();
    const interval = setInterval(updateDate, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="date-display"
    >
      {currentDate}
    </motion.div>
  );
}

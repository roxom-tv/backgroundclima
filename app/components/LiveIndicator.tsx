'use client';

import { motion } from 'framer-motion';

export default function LiveIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="live-indicator"
    >
      <div className="live-dot"></div>
      <span className="live-text">LIVE</span>
    </motion.div>
  );
}

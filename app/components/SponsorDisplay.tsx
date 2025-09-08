'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SponsorDisplay() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="sponsor-display"
    >
      {/* Sponsor Separator */}
      <motion.div 
        className="sponsor-separator"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ 
          duration: 0.5, 
          delay: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      ></motion.div>
      
      <motion.div 
        className="sponsor-content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4, 
          delay: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <motion.div 
          className="sponsor-text"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          Presented by
        </motion.div>
        <motion.div 
          className="sponsor-logo"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.8,
            ease: [0.34, 1.56, 0.64, 1]
          }}
        >
          <Image
            src="/xapologo.png"
            alt="XAPO BANK"
            width={240}
            height={80}
            className="xapo-logo"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

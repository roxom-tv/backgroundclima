'use client';

import { motion } from 'framer-motion';
import type { TransitionEffect } from '@/lib/supabase/types';

interface TransitionEffectProps {
  effect: TransitionEffect;
  isVisible: boolean;
  text?: string;
}

export default function TransitionEffectComponent({ 
  effect, 
  isVisible, 
  text = 'SWITCHING...' 
}: TransitionEffectProps) {
  if (!isVisible) return null;

  // No transition
  if (effect === 'none') {
    return null;
  }

  // TV Static effect
  if (effect === 'tv_static') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="channel-change-overlay"
        style={{ zIndex: 9999 }}
      >
        <div className="tv-static"></div>
        <div className="interference-lines"></div>
        <div className="channel-change-text">{text}</div>
      </motion.div>
    );
  }

  // Fade effect - smooth fade in/out
  if (effect === 'fade') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="text-white font-mono text-2xl uppercase tracking-wider text-center"
          style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}
        >
          {text}
        </motion.div>
      </motion.div>
    );
  }

  // Slide effect - smooth horizontal slide
  if (effect === 'slide') {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0.8 }}
        transition={{ 
          duration: 0.5, 
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: 0.3 }
        }}
        className="fixed inset-0 bg-gradient-to-r from-black via-black/95 to-black z-[9999] flex items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="text-white font-mono text-2xl uppercase tracking-wider text-center"
          style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}
        >
          {text}
        </motion.div>
      </motion.div>
    );
  }

  return null;
}

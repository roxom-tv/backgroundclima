import React from 'react';
import { motion } from 'framer-motion';

export default function CalendarSlide() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col items-center justify-center bg-black relative"
    >
      <div className="w-full h-full relative">
        <iframe 
          src="https://calendar-event-fc75.vercel.app/events" 
          className="w-full h-full border-0"
          style={{ 
            pointerEvents: 'auto' 
          }}
          title="Events Calendar"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        />
        
        {/* Overlay opcional para mantener el estilo visual si es necesario, 
            pero el usuario pidió ver el link "completo" así que mejor dejarlo limpio.
            Solo añadimos un borde sutil estilo CRT si queremos, pero por ahora limpio. */}
      </div>
    </motion.div>
  );
}


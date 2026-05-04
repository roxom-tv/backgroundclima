import React from 'react';
import { motion } from 'framer-motion';

export default function CalendarSlide() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 w-screen h-screen bg-black z-50 overflow-hidden flex items-center justify-center"
            style={{ margin: 0, padding: 0 }}
        >
            {/* 
         En vMix/OBS, a veces los iframes no renderizan bien el viewport.
         Forzamos un tamaño ligeramente superior y centrado para asegurar cobertura.
      */}
            <div className="relative w-full h-full">
                <iframe
                    src="https://calendar-event-fc75.vercel.app/events"
                    className="absolute top-0 left-0 w-full h-full border-0"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        // Si la web tiene márgenes internos, este scale ayuda a "acercarla".
                        // Descomenta y ajusta si necesitas hacer zoom:
                        // transform: 'scale(1.0)',
                        // transformOrigin: 'center center'
                    }}
                    title="Events Calendar"
                    scrolling="no" // Intentar evitar barras de scroll que achican el contenido
                />
            </div>
        </motion.div>
    );
}

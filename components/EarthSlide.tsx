'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const EarthAnimation = dynamic(() => import('./EarthHero/EarthAnimation'), {
    ssr: false,
    loading: () => null,
});

export default function EarthSlide() {
    return (
        <motion.div
            className="bg-black overflow-hidden"
            style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            {/*
             * Explicit vw/vh dimensions so canvas.offsetWidth/Height are non-zero
             * when EarthAnimation's ResizeObserver and resize() run on mount.
             */}
            <div
                className="pointer-events-none"
                style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh' }}
            >
                <EarthAnimation scrollY={0} />
            </div>
        </motion.div>
    );
}

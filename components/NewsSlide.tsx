'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Slide } from '@/lib/types/admin';

interface NewsSlideProps {
    slide: Slide;
    duration: number; // Duration in seconds for Ken Burns effect
}

export default function NewsSlide({ slide, duration }: NewsSlideProps) {
    const [kenBurnsKey, setKenBurnsKey] = useState(0);

    // Reset Ken Burns animation when slide changes
    useEffect(() => {
        setKenBurnsKey((prev) => prev + 1);
    }, [slide.id]);

    if (!slide.image_url) {
        return (
            <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-white text-xl">No image configured for news slide</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative overflow-hidden bg-black">
            {/* Background Image with Ken Burns Effect */}
            <motion.div
                key={kenBurnsKey}
                className="absolute inset-0"
                initial={{ scale: 1.1, x: '0%', y: '0%' }}
                animate={{
                    scale: [1.1, 1.25, 1.15],
                    x: ['0%', '-8%', '8%'],
                    y: ['0%', '-5%', '5%'],
                }}
                transition={{
                    duration: duration,
                    ease: [0.25, 0.1, 0.25, 1], // Smooth easing
                    repeat: Infinity,
                    repeatType: 'reverse',
                }}
                style={{
                    backgroundImage: `url(${slide.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    width: '120%',
                    height: '120%',
                    left: '-10%',
                    top: '-10%',
                }}
            >
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
            </motion.div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-12">
                {/* Source */}
                {slide.source && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-3"
                    >
                        <span className="text-white/80 text-sm md:text-base font-semibold uppercase tracking-wider border-l-4 border-white/80 pl-3">
                            {slide.source}
                        </span>
                    </motion.div>
                )}

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-2xl max-w-5xl"
                    style={{
                        textShadow: '2px 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
                    }}
                >
                    {slide.headline || slide.name}
                </motion.h1>

                {/* Description */}
                {slide.description && (
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed max-w-4xl drop-shadow-lg"
                        style={{
                            textShadow: '1px 1px 10px rgba(0,0,0,0.7)',
                        }}
                    >
                        {slide.description}
                    </motion.p>
                )}
            </div>
        </div>
    );
}

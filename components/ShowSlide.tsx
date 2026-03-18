'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Slide } from '@/lib/supabase/types';

interface ShowSlideProps {
  slide: Slide;
}

export default function ShowSlide({ slide }: ShowSlideProps) {
  // Parse schedule_times - handle both array and JSON string from database
  let scheduleTimes: { timezone: string; time: string }[] = [];
  if (Array.isArray(slide.schedule_times)) {
    scheduleTimes = slide.schedule_times;
  } else if (typeof slide.schedule_times === 'string') {
    try {
      scheduleTimes = JSON.parse(slide.schedule_times);
    } catch {
      scheduleTimes = [];
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full relative overflow-hidden bg-black"
    >
      {/* Background Image - Full 1920x1080 */}
      {slide.image_url ? (
        <Image
          src={slide.image_url}
          alt={slide.name}
          fill
          sizes="100vw"
          unoptimized
          className="absolute inset-0 object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black" />
      )}

      {/* Content Overlay - Right Side (only show if there's text content) */}
      {/* For show slides, only show text overlay if there's actual content beyond just the default "Show" name */}
      {((slide.name && slide.name.trim() !== 'Show') || slide.description || slide.host_name || slide.show_days || scheduleTimes.length > 0) && (
        <div className="absolute inset-0 flex">
          {/* Left side - empty, shows background image */}
          <div className="w-[48%]" />
          
          {/* Right side - text content overlay */}
          <div className="w-[52%] flex flex-col justify-center px-8 py-8">
            
            {/* Show Title - Yellow bordered box (only if name exists and is not default "Show") */}
            {slide.name && slide.name.trim() !== 'Show' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="border-2 border-[#D4A853] px-5 py-3 mb-6"
                style={{ width: 'fit-content', maxWidth: '95%' }}
              >
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                  {slide.name}
                </h1>
              </motion.div>
            )}

            {/* Description */}
            {slide.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-gray-200 text-lg md:text-xl mb-6 max-w-[90%]"
              >
                {slide.description}
              </motion.p>
            )}

            {/* With + Host Name */}
            {slide.host_name && (
              <>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-2xl md:text-3xl mb-2"
                >
                  With
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="border-2 border-[#D4A853] px-5 py-2 mb-8"
                  style={{ width: 'fit-content', maxWidth: '95%' }}
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                    {slide.host_name}
                  </h2>
                </motion.div>
              </>
            )}

            {/* Schedule Box - Yellow bordered */}
            {(slide.show_days || scheduleTimes.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-2 border-[#D4A853] px-5 py-4"
                style={{ width: 'fit-content', maxWidth: '95%' }}
              >
                {/* Days */}
                {slide.show_days && (
                  <p className="text-xl md:text-2xl font-bold text-white mb-2">
                    {slide.show_days}
                  </p>
                )}
                
                {/* Times for each timezone */}
                {scheduleTimes.length > 0 && (
                  <div className="space-y-0.5">
                    {scheduleTimes.map((schedule, index) => (
                      <p key={index} className="text-lg md:text-xl text-gray-200">
                        {schedule.time} {schedule.timezone}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}



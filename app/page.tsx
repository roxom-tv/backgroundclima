'use client';

import { useState, useEffect } from 'react';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import CenteredLogo from './components/CenteredLogo';
import { CITIES, ROTATION_SECONDS } from '@/config/cities';

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Handle manual city changes
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

  // Auto-rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % CITIES.length);
    }, ROTATION_SECONDS * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* Centered Logo with Black Background */}
      <CenteredLogo />
      
      {/* YouTube Live Background */}
      <RotatingBackground 
        activeIndex={activeIndex} 
        onIndexChange={handleIndexChange}
      />
      
      {/* Weather Overlay */}
      <WeatherBar activeIndex={activeIndex} />
    </main>
  );
}

'use client';

import { useState } from 'react';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import CenteredLogo from './components/CenteredLogo';

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Handle manual city changes
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

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

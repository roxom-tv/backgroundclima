'use client';

import { useState } from 'react';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import DateDisplay from './components/DateDisplay';
import LiveIndicator from './components/LiveIndicator';
import SponsorDisplay from './components/SponsorDisplay';

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Handle manual city changes
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* YouTube Live Background */}
      <RotatingBackground 
        activeIndex={activeIndex} 
        onIndexChange={handleIndexChange}
      />
      
      {/* Top Information Bar */}
      <div className="top-info-bar">
        {/* Date Display - Top Left */}
        <DateDisplay />
        
        {/* Live Indicator - Top Center */}
        <LiveIndicator />
      </div>
      
      {/* Bottom Information Bar */}
      <div className="bottom-info-bar">
        {/* Weather and Location Information */}
        <WeatherBar activeIndex={activeIndex} />
        
        {/* Sponsor Display - Bottom Right */}
        <SponsorDisplay />
      </div>
    </main>
  );
}

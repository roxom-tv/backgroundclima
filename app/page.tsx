'use client';

import { useState } from 'react';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import DateDisplay from './components/DateDisplay';
import LiveIndicator from './components/LiveIndicator';
import SponsorDisplay from './components/SponsorDisplay';
import { CITIES } from '@/config/cities';

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Determinar si es placa de mercado
  const isMarketPlate = (index: number): boolean => {
    return index % 2 === 1;
  };

  const getCityIndex = (index: number): number => {
    return Math.floor(index / 2);
  };

  // Handle manual city changes
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

  const currentCityIndex = getCityIndex(activeIndex);
  const showOverlays = !isMarketPlate(activeIndex);

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-black" style={{ margin: 0, padding: 0 }}>
      {/* YouTube Live Background o Market Plate */}
      <RotatingBackground 
        activeIndex={activeIndex} 
        onIndexChange={handleIndexChange}
      />
      
      {/* Top Information Bar - Solo mostrar en ciudades */}
      {showOverlays && (
        <div className="top-info-bar">
          {/* Date Display - Top Left */}
          <DateDisplay activeIndex={currentCityIndex} />
          
          {/* Live Indicator - Top Center */}
          <LiveIndicator />
        </div>
      )}
      
      {/* Bottom Information Bar - Solo mostrar en ciudades */}
      {showOverlays && (
        <div className="bottom-info-bar">
          {/* Weather and Location Information */}
          <WeatherBar activeIndex={currentCityIndex} />
          
          {/* Sponsor Display - Bottom Right */}
          <SponsorDisplay />
        </div>
      )}
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import DateDisplay from './components/DateDisplay';
import LiveIndicator from './components/LiveIndicator';
import SponsorDisplay from './components/SponsorDisplay';
import USDStats from '@/components/USDStats';
import { CITIES, ROTATION_SECONDS, DEBT_DISPLAY_SECONDS } from '@/config/cities';

type ViewMode = 'climate' | 'debt';

interface DebtData {
  liveEstimateNow: number;
  perSecond: number;
  annualFederalSpending: number;
  annualBudgetDeficit: number;
  btcPriceUsd: number;
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('climate');
  const [debtData, setDebtData] = useState<DebtData | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('LOADING INFORMATION...');

  // Obtener datos de deuda
  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        const response = await fetch('/api/debt');
        if (response.ok) {
          const data = await response.json();
          setDebtData({
            liveEstimateNow: data.liveEstimateNow,
            perSecond: data.perSecond,
            annualFederalSpending: data.annualFederalSpending,
            annualBudgetDeficit: data.annualBudgetDeficit,
            btcPriceUsd: data.btcPriceUsd,
          });
        }
      } catch (error) {
        console.error('Error fetching debt data:', error);
      }
    };

    fetchDebtData();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sistema de rotación entre clima y deuda
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let transitionTimeoutId: NodeJS.Timeout;

    if (viewMode === 'climate') {
      // Mostrar clima por 25 segundos, luego cambiar a deuda
      timeoutId = setTimeout(() => {
        // Mostrar transición con "LOADING INFORMATION..." (de clima a deuda)
        setTransitionText('LOADING INFORMATION...');
        setShowTransition(true);
        // Después de un delay similar al switching feed (2.5-3 segundos), cambiar a deuda
        transitionTimeoutId = setTimeout(() => {
          setViewMode('debt');
          // Ocultar transición después de que cambie (similar al efecto de cámaras)
          setTimeout(() => {
            setShowTransition(false);
          }, 500);
        }, 2500); // Tiempo similar al switching feed
      }, ROTATION_SECONDS * 1000);
    } else {
      // Mostrar deuda por 35 segundos, luego cambiar a clima
      timeoutId = setTimeout(() => {
        // Mostrar transición con "SWITCHING FEED..." (de deuda a clima)
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        // Después de un delay similar al switching feed (2.5-3 segundos), cambiar a clima
        transitionTimeoutId = setTimeout(() => {
          setViewMode('climate');
          // Avanzar a la siguiente ciudad
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          // Ocultar transición después de que cambie (similar al efecto de cámaras)
          setTimeout(() => {
            setShowTransition(false);
          }, 500);
        }, 2500); // Tiempo similar al switching feed
      }, DEBT_DISPLAY_SECONDS * 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (transitionTimeoutId) clearTimeout(transitionTimeoutId);
    };
  }, [viewMode]);

  // Ahora solo hay ciudades, el índice es directamente el índice de la ciudad
  const getCityIndex = (index: number): number => {
    return index % CITIES.length;
  };

  // Handle manual city changes
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

  const currentCityIndex = getCityIndex(activeIndex);
  const showOverlays = viewMode === 'climate';

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-black" style={{ margin: 0, padding: 0 }}>
      {/* Efecto de transición entre clima y deuda */}
      {showTransition && (
        <div className="channel-change-overlay">
          <div className="tv-static"></div>
          <div className="interference-lines"></div>
          <div className="channel-change-text">{transitionText}</div>
        </div>
      )}

      {/* Vista de Clima - YouTube Live Background */}
      {viewMode === 'climate' && (
        <>
          <RotatingBackground 
            activeIndex={activeIndex} 
            onIndexChange={handleIndexChange}
          />
          
          {/* Top Information Bar - Solo mostrar en clima */}
          {showOverlays && (
            <div className="top-info-bar">
              {/* Date Display - Top Left */}
              <DateDisplay activeIndex={currentCityIndex} />
              
              {/* Live Indicator - Top Center */}
              <LiveIndicator />
            </div>
          )}
          
          {/* Bottom Information Bar - Solo mostrar en clima */}
          {showOverlays && (
            <div className="bottom-info-bar">
              {/* Weather and Location Information */}
              <WeatherBar activeIndex={currentCityIndex} />
              
              {/* Sponsor Display - Bottom Right */}
              <SponsorDisplay />
            </div>
          )}
        </>
      )}

      {/* Vista de Deuda - Estadísticas */}
      {viewMode === 'debt' && debtData && (
        <div className="h-full w-full flex items-center justify-center bg-black p-4">
          <div className="w-full h-full max-w-[1920px] mx-auto">
            <USDStats
              liveDebtUSD={debtData.liveEstimateNow}
              perSecond={debtData.perSecond}
              base={debtData.liveEstimateNow}
              annualFederalSpending={debtData.annualFederalSpending}
              annualBudgetDeficit={debtData.annualBudgetDeficit}
              initialBtcPrice={debtData.btcPriceUsd}
            />
          </div>
        </div>
      )}
    </main>
  );
}

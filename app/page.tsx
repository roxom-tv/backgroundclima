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
  
  // Estados para la transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('');

  // Obtener datos de deuda (Background Fetch)
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
        } else {
          // Explicitly handle API failure
          console.error('Debt API failed with status:', response.status);
          // Keep existing data on error
        }
      } catch (error) {
        console.error('Error fetching debt data:', error);
        // Keep existing data on error
      }
    };

    fetchDebtData();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sistema de rotación y manejo de modos
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (viewMode === 'climate') {
      // Estamos viendo una ciudad -> Esperar ROTATION_SECONDS y cambiar a Deuda
      timeoutId = setTimeout(() => {
        // Iniciar transición
        setTransitionText('LOADING US DEBT INFO...');
        setShowTransition(true);
        
        // Esperar un poco para el efecto de estática
        setTimeout(() => {
          setViewMode('debt');
          setShowTransition(false);
        }, 1500);
      }, ROTATION_SECONDS * 1000);
    } else if (viewMode === 'debt') {
      // Estamos viendo la deuda -> Esperar DEBT_DISPLAY_SECONDS y cambiar a la siguiente ciudad
      timeoutId = setTimeout(() => {
        // Iniciar transición
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        
        // Esperar un poco para el efecto de estática
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          setViewMode('climate');
          setShowTransition(false);
        }, 1500);
      }, DEBT_DISPLAY_SECONDS * 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [viewMode, activeIndex]);

  // Manejo manual del cambio de índice (por si se agrega interactividad futura)
  const handleIndexChange = (newIndex: number) => {
    setActiveIndex(newIndex);
  };

  const currentCityIndex = activeIndex % CITIES.length;

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-black" style={{ margin: 0, padding: 0 }}>
      {/* Efecto de transición (TV Static) */}
      {showTransition && (
        <div className="channel-change-overlay" style={{ zIndex: 9999 }}>
          <div className="tv-static"></div>
          <div className="interference-lines"></div>
          <div className="channel-change-text">{transitionText}</div>
        </div>
      )}

      {/* Vista de Clima / Ciudad */}
      {viewMode === 'climate' && (
        <>
          <RotatingBackground 
            activeIndex={activeIndex} 
            onIndexChange={handleIndexChange}
          />
          
          <div className="top-info-bar">
            <DateDisplay activeIndex={currentCityIndex} />
            <LiveIndicator />
          </div>
          
          <div className="bottom-info-bar">
            <WeatherBar activeIndex={currentCityIndex} />
            <SponsorDisplay />
          </div>
        </>
      )}

      {/* Vista de Deuda */}
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
      
      {/* Fallback if debt data fails to load - Shows an error message */}
      {viewMode === 'debt' && !debtData && (
         <div className="h-full w-full flex flex-col items-center justify-center bg-black gap-4">
           <div className="text-red-500 text-4xl font-bold tracking-wider">DATA UNAVAILABLE</div>
           <div className="text-white text-xl tracking-wider">Unable to fetch live US Debt info</div>
           <div className="text-gray-500 text-sm mt-4">Retrying automatically...</div>
         </div>
      )}
    </main>
  );
}

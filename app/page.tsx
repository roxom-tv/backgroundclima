'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import DateDisplay from './components/DateDisplay';
import LiveIndicator from './components/LiveIndicator';
import SponsorDisplay from './components/SponsorDisplay';
import USDStats from '@/components/USDStats';
import MetalsSlide from '@/components/MetalsSlide';
import OilSlide from '@/components/OilSlide';
import FxSlide from '@/components/FxSlide';
import { CITIES, ROTATION_SECONDS, DEBT_DISPLAY_SECONDS, MARKET_SLIDE_SECONDS } from '@/config/cities';
import { prefetchAllWeatherData } from '@/lib/weather-prefetch';
import { prefetchMarketsData } from '@/hooks/useMarketsSats';

type ViewMode = 'climate' | 'debt' | 'metals' | 'oil' | 'fx';

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

  // Pre-fetch weather and market data for all cities on mount (runs once)
  useEffect(() => {
    // Pre-fetch all weather data in background to minimize requests when switching cities
    prefetchAllWeatherData().catch(error => {
      console.warn('Weather prefetch failed:', error);
      // Non-critical, continue anyway
    });
    
    // Pre-fetch market data immediately so slides don't show loading
    prefetchMarketsData().catch(error => {
      console.warn('Markets prefetch failed:', error);
      // Non-critical, continue anyway
    });
  }, []);

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
    // Actualizar cada 15 minutos (la deuda cambia lentamente, optimizado para minimizar API calls)
    const interval = setInterval(fetchDebtData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sistema de rotación y manejo de modos
  // Flujo: ciudad -> deuda -> ciudad -> metals -> ciudad -> oil -> ciudad -> fx -> ciudad -> deuda -> etc.
  const [nextMarketSlide, setNextMarketSlide] = useState<'debt' | 'metals' | 'oil' | 'fx'>('debt');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const transitionDelay = 1500; // Tiempo de transición con efecto estático

    if (viewMode === 'climate') {
      // Estamos viendo una ciudad -> Esperar ROTATION_SECONDS y cambiar al siguiente slide de mercado
      timeoutId = setTimeout(() => {
        if (nextMarketSlide === 'debt') {
          setTransitionText('LOADING US DEBT INFO...');
        } else {
          setTransitionText('LOADING MARKET DATA...');
        }
        setShowTransition(true);
        setTimeout(() => {
          setViewMode(nextMarketSlide);
          setShowTransition(false);
        }, transitionDelay);
      }, ROTATION_SECONDS * 1000);
    } else if (viewMode === 'debt') {
      // Deuda -> Siguiente ciudad
      timeoutId = setTimeout(() => {
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          setViewMode('climate');
          setNextMarketSlide('metals'); // Después de deuda, viene metals
          setShowTransition(false);
        }, transitionDelay);
      }, DEBT_DISPLAY_SECONDS * 1000);
    } else if (viewMode === 'metals') {
      // Metals -> Siguiente ciudad
      timeoutId = setTimeout(() => {
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          setViewMode('climate');
          setNextMarketSlide('oil'); // Después de metals, viene oil
          setShowTransition(false);
        }, transitionDelay);
      }, MARKET_SLIDE_SECONDS * 1000);
    } else if (viewMode === 'oil') {
      // Oil -> Siguiente ciudad
      timeoutId = setTimeout(() => {
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          setViewMode('climate');
          setNextMarketSlide('fx'); // Después de oil, viene fx
          setShowTransition(false);
        }, transitionDelay);
      }, MARKET_SLIDE_SECONDS * 1000);
    } else if (viewMode === 'fx') {
      // FX -> Siguiente ciudad
      timeoutId = setTimeout(() => {
        setTransitionText('SWITCHING FEED...');
        setShowTransition(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % CITIES.length);
          setViewMode('climate');
          setNextMarketSlide('debt'); // Después de fx, vuelve a deuda
          setShowTransition(false);
        }, transitionDelay);
      }, MARKET_SLIDE_SECONDS * 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [viewMode, activeIndex, nextMarketSlide]);

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

      {/* Vistas de Mercado con AnimatePresence */}
      <AnimatePresence mode="wait">
        {viewMode === 'metals' && (
          <div key="metals" className="h-full w-full flex items-center justify-center bg-black p-4">
            <div className="w-full h-full max-w-[1920px] mx-auto">
              <MetalsSlide />
            </div>
          </div>
        )}
        {viewMode === 'oil' && (
          <div key="oil" className="h-full w-full flex items-center justify-center bg-black p-4">
            <div className="w-full h-full max-w-[1920px] mx-auto">
              <OilSlide />
            </div>
          </div>
        )}
        {viewMode === 'fx' && (
          <div key="fx" className="h-full w-full flex items-center justify-center bg-black p-4">
            <div className="w-full h-full max-w-[1920px] mx-auto">
              <FxSlide />
            </div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

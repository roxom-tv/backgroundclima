'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeatherData } from '@/lib/openweather';
import type { Slide } from '@/lib/supabase/types';

interface WeatherBarProps {
  activeIndex: number;
  currentSlide: Slide | null;
  visible?: boolean;
}

export default function WeatherBar({ activeIndex, currentSlide, visible = true }: WeatherBarProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Fetch weather data when city changes
  useEffect(() => {
    if (!visible || !currentSlide) {
      return;
    }

    const fetchWeather = async () => {
      if (!currentSlide.weather_query) {
        setWeatherData(null);
        return;
      }

      try {
        // Use API route to keep API key secure on server
        const response = await fetch(`/api/weather?query=${encodeURIComponent(currentSlide.weather_query)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch weather');
        }
        const data = await response.json();
        setWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherData(null);
      }
    };

    fetchWeather();
  }, [visible, currentSlide]);

  // Don't render if not visible or no slide
  if (!visible || !currentSlide) {
    return null;
  }

  const cityName = currentSlide.name || 'Unknown';
  const countryName = currentSlide.country || '';

  return (
    <>
      {/* Location Display - Bottom Left */}
      <div className="location-display">
        <AnimatePresence mode="wait">
          <motion.div
            key={`location-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.4,
              ease: "easeInOut"
            }}
            className="location-content"
          >
            <div className="city-name">
              {cityName.toUpperCase()}
            </div>
            {countryName && (
            <div className="country-name">
                {countryName.toUpperCase()}
            </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Weather Information - Bottom Center */}
      <div className="weather-info-display">
        <div className="weather-info-content">
          {/* Temperature Section */}
          <div className="weather-section">
            <AnimatePresence mode="wait">
              <motion.div
                key={`temp-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeInOut"
                }}
                className="weather-values"
              >
                {weatherData ? (
                  <>
                    <span className="temp-fahrenheit">
                      {Math.round(weatherData.tempC * 9/5 + 32)}°F
                    </span>
                    <span className="temp-separator">
                      |
                    </span>
                    <span className="temp-celsius">
                      {weatherData.tempC}°C
                    </span>
                  </>
                ) : (
                  <>
                    <span className="temp-fahrenheit">--°F</span>
                    <span className="temp-separator">|</span>
                    <span className="temp-celsius">--°C</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="weather-label">
              Temperature
            </div>
          </div>

          {/* Wind Section */}
          <div className="weather-section">
            <AnimatePresence mode="wait">
              <motion.div
                key={`wind-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeInOut"
                }}
                className="weather-values"
              >
                {weatherData ? (
                  <>
                    <span className="wind-kmh">
                      {weatherData.windKmh} km/h
                    </span>
                    <span className="wind-separator">
                      |
                    </span>
                    <span className="wind-mph">
                      {Math.round(weatherData.windKmh * 0.621371)} mph
                    </span>
                  </>
                ) : (
                  <>
                    <span className="wind-kmh">-- km/h</span>
                    <span className="wind-separator">|</span>
                    <span className="wind-mph">-- mph</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="weather-label">
              Wind
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

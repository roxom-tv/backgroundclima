'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES } from '@/config/cities';
import { fetchCurrentWeather, type WeatherData } from '@/lib/openweather';

interface WeatherBarProps {
  activeIndex: number;
}

export default function WeatherBar({ activeIndex }: WeatherBarProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const currentCity = CITIES[activeIndex];

  // Fetch weather data when city changes
  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const data = await fetchCurrentWeather(currentCity.openWeatherQuery);
        setWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [currentCity.openWeatherQuery]);

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
              {currentCity.name.toUpperCase()}
            </div>
            <div className="country-name">
              {currentCity.country.toUpperCase()}
            </div>
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

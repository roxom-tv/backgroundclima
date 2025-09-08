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
            initial={{ opacity: 0, x: -30, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -30, y: -10 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.1
            }}
            className="location-content"
          >
            <motion.div 
              className="city-name"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {currentCity.name.toUpperCase()}
            </motion.div>
            <motion.div 
              className="country-name"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {currentCity.country.toUpperCase()}
            </motion.div>
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
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 1.05 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.2
                }}
                className="weather-values"
              >
                {weatherData ? (
                  <>
                    <motion.span 
                      className="temp-fahrenheit"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      {Math.round(weatherData.tempC * 9/5 + 32)}°F
                    </motion.span>
                    <motion.span 
                      className="temp-separator"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.4 }}
                    >
                      |
                    </motion.span>
                    <motion.span 
                      className="temp-celsius"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      {weatherData.tempC}°C
                    </motion.span>
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
            <motion.div 
              className="weather-label"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              Temperature
            </motion.div>
          </div>

          {/* Separator */}
          <motion.div 
            className="weather-separator"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          ></motion.div>

          {/* Wind Section */}
          <div className="weather-section">
            <AnimatePresence mode="wait">
              <motion.div
                key={`wind-${activeIndex}`}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 1.05 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.3
                }}
                className="weather-values"
              >
                {weatherData ? (
                  <>
                    <motion.span 
                      className="wind-kmh"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      {weatherData.windKmh} km/h
                    </motion.span>
                    <motion.span 
                      className="wind-separator"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.5 }}
                    >
                      |
                    </motion.span>
                    <motion.span 
                      className="wind-mph"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      {Math.round(weatherData.windKmh * 0.621371)} mph
                    </motion.span>
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
            <motion.div 
              className="weather-label"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              Wind
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

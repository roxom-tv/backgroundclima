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
    <div className="weather-bar">
      <div className="weather-content">
        <div className="weather-details">
          {/* Columna 1: Ciudad y País (ocupa 2 filas) */}
          <div className="city-country">
            <AnimatePresence mode="wait">
              <motion.div
                key={`city-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="city-name"
              >
                {currentCity.name}
              </motion.div>
            </AnimatePresence>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`country-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="country-name"
              >
                {currentCity.country}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Columna 2: Temperatura - Fila 1: Valores, Fila 2: Título */}
          <div className="weather-item">
            <div className="weather-tile">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`temp-${activeIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="temp-both-units"
                >
                  {weatherData ? (
                    <>
                      <div className="temp-celsius">{weatherData.tempC}°C</div>
                      <div className="temp-fahrenheit">{Math.round(weatherData.tempC * 9/5 + 32)}°F</div>
                    </>
                  ) : (
                    <>
                      <div className="temp-celsius">--°C</div>
                      <div className="temp-fahrenheit">--°F</div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="tile-title">Temperature</div>
            </div>
          </div>

          {/* Columna 3: Viento - Fila 1: Valores, Fila 2: Título */}
          <div className="weather-item">
            <div className="weather-tile">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`wind-${activeIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="wind-both-units"
                >
                  {weatherData ? (
                    <>
                      <div className="wind-kmh">{weatherData.windKmh} km/h</div>
                      <div className="wind-mph">{Math.round(weatherData.windKmh * 0.621371)} mph</div>
                    </>
                  ) : (
                    <>
                      <div className="wind-kmh">-- km/h</div>
                      <div className="wind-mph">-- mph</div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="tile-title">Wind</div>
            </div>
          </div>

          {/* Columna 4: Clima - Fila 1: Icono, Fila 2: Título */}
          <div className="weather-item">
            <div className="weather-tile-weather">
              <AnimatePresence mode="wait">
                {weatherData?.conditionIconUrl && (
                  <motion.img
                    key={`weather-icon-${activeIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    src={weatherData.conditionIconUrl}
                    alt={weatherData.conditionText}
                    className="weather-main-icon"
                  />
                )}
              </AnimatePresence>
              <div className="weather-title">Weather</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

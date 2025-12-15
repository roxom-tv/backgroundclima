/**
 * Pre-fetch weather data for all cities to minimize requests when switching cities
 * This ensures all weather data is cached before users need it
 */

import { fetchCurrentWeather } from './openweather';
import { CITIES } from '@/config/cities';

/**
 * Pre-fetch weather data for all cities
 * This should be called once when the app starts
 */
export async function prefetchAllWeatherData(): Promise<void> {
  // Fetch weather for all cities in parallel (with rate limiting handled by openweather.ts)
  const promises = CITIES.map(city => 
    fetchCurrentWeather(city.openWeatherQuery).catch(error => {
      // Silently fail for individual cities - cache will use fallback data
      console.warn(`Failed to prefetch weather for ${city.name}:`, error);
      return null;
    })
  );

  // Wait for all requests to complete (or fail gracefully)
  await Promise.allSettled(promises);
  
  console.log('Weather data prefetch completed for all cities');
}


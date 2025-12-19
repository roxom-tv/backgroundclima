/**
 * Pre-fetch weather data for all YouTube slides to minimize requests when switching
 * This ensures all weather data is cached before users need it
 */

import { fetchCurrentWeather } from './openweather';
import { createClient } from '@supabase/supabase-js';

// Create a simple Supabase client for server-side prefetching
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
}

interface SlideWithWeather {
  id: string;
  name: string;
  weather_query: string | null;
}

/**
 * Pre-fetch weather data for all active YouTube slides from Supabase
 * This should be called once when the app starts
 */
export async function prefetchAllWeatherData(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch all active YouTube slides that have weather queries
    const { data: slides, error } = await supabase
      .from('slides')
      .select('id, name, weather_query')
      .eq('type', 'youtube')
      .eq('is_active', true)
      .not('weather_query', 'is', null);

    if (error) {
      console.warn('Failed to fetch slides for weather prefetch:', error);
      return;
    }

    if (!slides || slides.length === 0) {
      console.log('No slides with weather queries found');
      return;
    }

    // Get unique weather queries (avoid duplicate fetches)
    const uniqueQueries = [...new Set(
      (slides as SlideWithWeather[])
        .map(s => s.weather_query)
        .filter((q): q is string => q !== null && q.trim() !== '')
    )];

    // Fetch weather for all unique queries in parallel
    const promises = uniqueQueries.map(query => 
      fetchCurrentWeather(query).catch(error => {
        console.warn(`Failed to prefetch weather for "${query}":`, error);
        return null;
      })
    );

    await Promise.allSettled(promises);
    
    console.log(`Weather data prefetch completed for ${uniqueQueries.length} locations`);
  } catch (error) {
    console.warn('Weather prefetch failed:', error);
  }
}


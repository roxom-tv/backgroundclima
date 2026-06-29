/**
 * Pre-fetch weather data for all YouTube slides to minimize requests when switching
 * This ensures all weather data is cached before users need it
 */

import { and, eq, isNotNull } from 'drizzle-orm';
import { fetchCurrentWeather } from './openweather';
import { getDb } from '@/lib/db/client';
import { slidesTable } from '@/lib/db/schema';

/**
 * Pre-fetch weather data for all active YouTube slides from D1
 * This should be called once when the app starts
 */
export async function prefetchAllWeatherData(): Promise<void> {
    try {
        const db = await getDb();

        // Fetch all active YouTube slides that have weather queries
        const slides = await db
            .select({
                id: slidesTable.id,
                name: slidesTable.name,
                weather_query: slidesTable.weather_query,
            })
            .from(slidesTable)
            .where(
                and(
                    eq(slidesTable.type, 'youtube'),
                    eq(slidesTable.is_active, true),
                    isNotNull(slidesTable.weather_query),
                ),
            );

        if (slides.length === 0) {
            return;
        }

        // Get unique weather queries (avoid duplicate fetches)
        const uniqueQueries = [
            ...new Set(
                slides
                    .map((s) => s.weather_query)
                    .filter((q): q is string => q !== null && q.trim() !== ''),
            ),
        ];

        // Fetch weather for all unique queries in parallel
        const promises = uniqueQueries.map((query) =>
            fetchCurrentWeather(query).catch((error) => {
                console.warn(`Failed to prefetch weather for "${query}":`, error);

                return null;
            }),
        );

        await Promise.allSettled(promises);
    } catch (error) {
        console.warn('Weather prefetch failed:', error);
    }
}

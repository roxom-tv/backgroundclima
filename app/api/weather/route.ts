import { NextRequest, NextResponse } from 'next/server';
import { fetchCurrentWeather } from '@/lib/openweather';

/**
 * API Route to fetch weather data
 * This keeps the OpenWeather API key secure on the server
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        const weatherData = await fetchCurrentWeather(query);

        if (!weatherData) {
            return NextResponse.json({ error: 'Weather data not available' }, { status: 404 });
        }

        return NextResponse.json(weatherData);
    } catch (error) {
        console.error('Error fetching weather:', error);

        return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
    }
}

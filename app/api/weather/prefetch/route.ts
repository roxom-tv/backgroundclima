import { NextResponse } from 'next/server';
import { prefetchAllWeatherData } from '@/lib/weather-prefetch';

/**
 * Server-side weather warmup. Reads slides from D1 (getCloudflareContext is
 * server-only) and pre-fetches weather for active YouTube slides. Triggered
 * fire-and-forget from the client display so the browser never imports the
 * D1 / Cloudflare-context code.
 */
export async function POST(): Promise<NextResponse> {
    await prefetchAllWeatherData();

    return NextResponse.json({ success: true });
}

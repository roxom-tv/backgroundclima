import { NextResponse } from 'next/server';
import { getBTCPriceWithCache } from '@/lib/btc-cache';

export const revalidate = 0; // No cache - always fetch fresh data

export async function GET() {
    try {
        // Use shared cache to avoid duplicate API calls
        const btcPrice = await getBTCPriceWithCache();

        const result = {
            btcPriceUsd: btcPrice,
            timestamp: new Date().toISOString(),
        };

        const nextResponse = NextResponse.json(result);
        // Cache for 30 seconds on CDN level (matches our internal cache duration)
        nextResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

        return nextResponse;
    } catch (error) {
        console.error('BTC API error:', error instanceof Error ? error.message : 'Unknown error');

        return NextResponse.json({ error: 'Failed to fetch BTC price' }, { status: 500 });
    }
}

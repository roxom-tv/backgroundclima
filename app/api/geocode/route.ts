import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/geocode?q=London
 * GET /api/geocode?q=51.5074,-0.1278   (passthrough for lat,lon format)
 *
 * Returns { lat: number, lon: number } using Nominatim (free, no key).
 */
export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim();

    if (!q) {
        return NextResponse.json({ error: 'Missing q param' }, { status: 400 });
    }

    // If already "lat,lon" format, reverse-geocode for country_code then return
    const latLonMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

    if (latLonMatch) {
        const lat = parseFloat(latLonMatch[1]);
        const lon = parseFloat(latLonMatch[2]);
        try {
            const revParams = new URLSearchParams({
                lat: String(lat),
                lon: String(lon),
                format: 'json',
                addressdetails: '1',
                'accept-language': 'en',
            });
            const revRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?${revParams}`,
                { headers: { 'User-Agent': 'ROXOM-Widgets/1.0' } },
            );
            if (revRes.ok) {
                const revData = (await revRes.json()) as { address?: { country_code?: string } };
                const countryCode = revData.address?.country_code?.toUpperCase() ?? null;
                return NextResponse.json({ lat, lon, countryCode });
            }
        } catch {
            // fall through without country
        }
        return NextResponse.json({ lat, lon, countryCode: null });
    }

    try {
        // Use featuretype=city to prefer populated cities over other place types,
        // and accept-language=en for consistent results.
        // Prefer results with higher importance (major cities rank higher).
        const params = new URLSearchParams({
            q,
            format: 'json',
            limit: '5',
            featuretype: 'city',
            'accept-language': 'en',
            addressdetails: '1',
        });
        const url = `https://nominatim.openstreetmap.org/search?${params}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'ROXOM-Widgets/1.0' },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Nominatim request failed' }, { status: 502 });
        }

        const data = (await res.json()) as Array<{
            lat: string;
            lon: string;
            importance: number;
            type: string;
            addresstype: string;
            address?: { country_code?: string };
        }>;

        if (!data.length) {
            return NextResponse.json({ error: `Location not found: ${q}` }, { status: 404 });
        }

        // Pick the result with the highest Nominatim importance score.
        const best = data.reduce((a, b) => (b.importance > a.importance ? b : a));
        const countryCode = best.address?.country_code?.toUpperCase() ?? null;

        return NextResponse.json({
            lat: parseFloat(best.lat),
            lon: parseFloat(best.lon),
            countryCode,
        });
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

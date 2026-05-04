import { NextResponse } from 'next/server';

/**
 * SATA slide data — proxies to rtv-api /api/strc/strive.
 * Adds the API key server-side so the browser doesn't need it.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    const rtvApiUrl = (process.env.RTV_API_URL || 'https://api.roxom.tv').replace(/\/$/, '');
    const rtvApiKey = process.env.RTV_API_KEY || process.env.NEXT_PUBLIC_RTV_API_KEY || '';

    const target = `${rtvApiUrl}/api/strc/strive`;

    try {
        const headers: Record<string, string> = { Accept: 'application/json' };

        if (rtvApiKey) {
            headers['x-api-key'] = rtvApiKey;
        }

        const res = await fetch(target, {
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
            return NextResponse.json({ error: `rtv-api returned ${res.status}` }, { status: 502 });
        }
        const envelope = await res.json();
        const data = envelope?.success && envelope.data ? envelope.data : envelope;

        return NextResponse.json(data);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Upstream fetch failed';

        return NextResponse.json({ error: message }, { status: 502 });
    }
}

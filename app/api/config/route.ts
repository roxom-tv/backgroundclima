import { NextResponse } from 'next/server';
import { getConfigSnapshot } from '@/lib/config/config-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildConfigErrorResponse(error: unknown) {
    const traceId = crypto.randomUUID();
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const isMissingBinding =
        rawMessage.includes('D1') ||
        rawMessage.includes('database') ||
        rawMessage.includes('binding');

    const hint = isMissingBinding
        ? 'Check the D1 database binding (DB) in wrangler.jsonc and that migrations are applied.'
        : 'Check API logs using traceId for more details.';

    return NextResponse.json(
        {
            status: 'error',
            error: {
                code: 'CONFIG_FETCH_FAILED',
                message: 'Failed to fetch app config.',
                hint,
                traceId,
            },
            timestamp: new Date().toISOString(),
        },
        {
            status: 500,
            headers: { 'Cache-Control': 'no-store' },
        },
    );
}

export async function GET() {
    try {
        const snapshot = await getConfigSnapshot();

        return NextResponse.json(snapshot, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error('Failed to fetch app config:', error);

        return buildConfigErrorResponse(error);
    }
}

import { NextResponse } from 'next/server';
import { getConfigVersion } from '@/lib/config/config-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildVersionErrorResponse(error: unknown) {
    const traceId = crypto.randomUUID();
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const isFetchFailure = rawMessage.includes('fetch failed');
    const isMissingEnv = rawMessage.includes('Missing Supabase environment variables');

    const hint = isMissingEnv
        ? 'Set SUPABASE_URL/SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        : isFetchFailure
          ? 'Cannot reach Supabase. Check URL/key values and network access.'
          : 'Check API logs using traceId for more details.';

    return NextResponse.json(
        {
            status: 'error',
            error: {
                code: 'CONFIG_VERSION_FETCH_FAILED',
                message: 'Failed to fetch config version.',
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
        const version = await getConfigVersion();

        return NextResponse.json(
            { version, checkedAt: new Date().toISOString() },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=8, stale-while-revalidate=30',
                },
            },
        );
    } catch (error) {
        console.error('Failed to fetch config version:', error);

        return buildVersionErrorResponse(error);
    }
}

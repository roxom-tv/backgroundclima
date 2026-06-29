import { NextRequest, NextResponse } from 'next/server';

import { getMediaBucket } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
    const { path } = await params;

    if (!path || path.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reject path traversal attempts
    if (path.some((segment) => segment === '..' || segment === '')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const key = path.join('/');

    try {
        const bucket = await getMediaBucket();
        const obj = await bucket.get(key);

        if (!obj) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const headers = new Headers();
        const contentType = obj.httpMetadata?.contentType;

        if (contentType) {
            headers.set('content-type', contentType);
        }

        headers.set('content-length', String(obj.size));
        headers.set('cache-control', 'public, max-age=31536000, immutable');

        return new Response(obj.body, { status: 200, headers });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 },
        );
    }
}

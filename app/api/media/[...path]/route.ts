import { NextRequest, NextResponse } from 'next/server';

import { getMediaBucket } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

/** Mirrors ALLOWED_MIME_TYPES in lib/storage/media-upload.ts. Notably no SVG. */
const SERVABLE_INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

        // Serve only the image types the upload route validates. Anything else
        // in the bucket (legacy objects predating that validation, e.g. stored
        // SVGs) is served as a plain download rather than rendered inline, so a
        // document that can execute script cannot do so on our origin.
        if (contentType && SERVABLE_INLINE_TYPES.has(contentType)) {
            headers.set('content-type', contentType);
        } else {
            headers.set('content-type', 'application/octet-stream');
            headers.set('content-disposition', 'attachment');
        }

        // Stops the browser second-guessing the declared type and rendering,
        // say, a sniffed SVG as markup.
        headers.set('x-content-type-options', 'nosniff');
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

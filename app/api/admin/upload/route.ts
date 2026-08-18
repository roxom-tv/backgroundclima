import { NextRequest, NextResponse } from 'next/server';

import { getMediaBucket } from '@/lib/storage/r2';
import { buildObjectKey, validateUpload } from '@/lib/storage/media-upload';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

const ALLOWED_PREFIXES = ['events', 'sponsors'] as const;
type AllowedPrefix = (typeof ALLOWED_PREFIXES)[number];

function isAllowedPrefix(value: unknown): value is AllowedPrefix {
    return typeof value === 'string' && (ALLOWED_PREFIXES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const rawPrefix = formData.get('prefix') ?? formData.get('folder');

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 },
            );
        }

        const validated = await validateUpload(file);

        if (!validated.ok) {
            return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
        }

        const prefix: AllowedPrefix = isAllowedPrefix(rawPrefix) ? rawPrefix : 'sponsors';
        const key = buildObjectKey(prefix, validated.extension);

        const bucket = await getMediaBucket();

        // contentType comes from the validated allowlist, never from file.type
        // directly — the serving route echoes this value back as a header.
        await bucket.put(key, validated.bytes, {
            httpMetadata: { contentType: validated.contentType },
        });

        const url = `/api/media/${key}`;

        return withRenewal(
            NextResponse.json({ success: true, data: { url, key } }, { status: 201 }),
            auth.setCookie,
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 },
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';

import { getMediaBucket } from '@/lib/storage/r2';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_PREFIXES = ['events', 'sponsors'] as const;
type AllowedPrefix = (typeof ALLOWED_PREFIXES)[number];

const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
};

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

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type' },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File exceeds 5MB limit' },
                { status: 400 },
            );
        }

        const prefix: AllowedPrefix = isAllowedPrefix(rawPrefix) ? rawPrefix : 'sponsors';
        const ext = MIME_TO_EXT[file.type] ?? file.name.split('.').pop() ?? 'bin';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const key = `${prefix}/${fileName}`;

        const bucket = await getMediaBucket();
        const arrayBuffer = await file.arrayBuffer();

        await bucket.put(key, arrayBuffer, { httpMetadata: { contentType: file.type } });

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

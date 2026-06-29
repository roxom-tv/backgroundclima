import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig } from '@/lib/auth/config';
import { signToken } from '@/lib/auth/session-token';
import { setSessionCookie } from '@/lib/auth/cookies';

const MS_PER_DAY = 86_400_000;
const SESSION_TTL_DAYS_FALLBACK = 7;

const bodySchema = z.object({
    password: z.string().min(1),
});

/**
 * Constant-time string comparison. Always iterates over the full length of
 * the reference string to avoid leaking length or character information via timing.
 */
function timingSafeEqual(provided: string, reference: string): boolean {
    const providedBytes = new TextEncoder().encode(provided);
    const referenceBytes = new TextEncoder().encode(reference);

    let diff = providedBytes.length === referenceBytes.length ? 0 : 1;
    const len = referenceBytes.length;

    for (let i = 0; i < len; i++) {
        diff |= (i < providedBytes.length ? providedBytes[i] : 0) ^ referenceBytes[i];
    }

    return diff === 0;
}

export async function POST(req: Request): Promise<NextResponse> {
    let body: unknown;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 },
        );
    }

    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
        return NextResponse.json(
            { success: false, error: 'Missing or invalid password field' },
            { status: 400 },
        );
    }

    const { env } = getCloudflareContext();
    const adminPassword = env.ADMIN_PASSWORD;
    const sessionSecret = env.SESSION_SECRET;

    if (!adminPassword || !sessionSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const match = timingSafeEqual(parseResult.data.password, adminPassword);

    if (!match) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const cfgResult = getConfig();
    const ttlDays = cfgResult.success ? cfgResult.data.sessionTtlDays : SESSION_TTL_DAYS_FALLBACK;
    const expiryMs = Date.now() + ttlDays * MS_PER_DAY;
    const token = await signToken(expiryMs, sessionSecret);

    const response = NextResponse.json({ success: true });

    if (cfgResult.success) {
        const cookieHeaders = new Headers();
        setSessionCookie(cookieHeaders, token, cfgResult.data);
        const setCookie = cookieHeaders.get('Set-Cookie');

        if (setCookie) {
            response.headers.set('Set-Cookie', setCookie);
        }
    }

    return response;
}

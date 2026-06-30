import { NextResponse } from 'next/server';
import { oktaAuthHandler } from '@/lib/auth/index';

/**
 * GET /auth/okta
 * Initiates the Okta OIDC authorization code + PKCE flow.
 *
 * The vendored kit handler persists PKCE verifier + state server-side in D1 and
 * returns JSON `{ location }` with 200 (SPA-style). backgroundclima drives this
 * from a plain anchor / gate redirect, so we follow the location with a 302 here.
 * On the kit's error path (non-2xx) we pass the response through unchanged.
 */
export async function GET(req: Request): Promise<Response> {
    const res = await oktaAuthHandler(req);

    if (!res.ok) {
        return res;
    }

    const { location } = (await res.json()) as { location?: string };

    if (!location) {
        return NextResponse.json({ error: 'Missing authorize URL' }, { status: 500 });
    }

    return NextResponse.redirect(location, 302);
}

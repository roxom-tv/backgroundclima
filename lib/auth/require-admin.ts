import { NextResponse } from 'next/server';
import { withSession } from './middleware';

type AuthResult =
    | { denied: true; response: NextResponse }
    | { denied: false; setCookie: string | null };

/**
 * Validates the signed-cookie session on an admin API request.
 *
 * Returns `{ denied: true, response }` with a 401 when no valid session exists.
 * Returns `{ denied: false, setCookie }` on success; forward setCookie on the
 * final response to renew the sliding-window TTL.
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
    const { authenticated, setCookie } = await withSession(req);

    if (!authenticated) {
        return {
            denied: true,
            response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
        };
    }

    return { denied: false, setCookie };
}

/**
 * Attaches the sliding-window Set-Cookie renewal header to a response when
 * the session middleware emitted one. Call this on every success response
 * after a requireAdmin check.
 */
export function withRenewal(response: NextResponse, setCookie: string | null): NextResponse {
    if (setCookie) {
        response.headers.set('Set-Cookie', setCookie);
    }

    return response;
}

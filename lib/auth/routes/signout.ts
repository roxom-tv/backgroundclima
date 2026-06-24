import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { getConfig } from '../config';
import { clearSessionCookie, readSessionCookie } from '../cookies';
import { destroySession } from '../session';
import { buildEndSessionUrl } from '../okta';

/**
 * POST /auth/signout
 * Performs two-phase Okta logout:
 *  1. Local: destroys the D1 session row and clears the session cookie.
 *  2. Okta: redirects to Okta's end-session endpoint with id_token_hint
 *     so the Okta session is also terminated.
 *
 * Falls back to a plain redirect to / if the config is unavailable or
 * no id_token was stored on the session row.
 *
 * The post_logout_redirect_uri must be registered in your Okta app's
 * "Sign-out redirect URIs" list.
 */
export async function POST(req: Request): Promise<Response> {
    const cfgResult = getConfig();
    const headers = new Headers();

    if (!cfgResult.success) {
        headers.set('Location', '/');

        return new Response(null, { status: 302, headers });
    }

    const cfg = cfgResult.data;
    const sessionId = readSessionCookie(req);
    let idToken: string | null = null;

    if (sessionId) {
        const { env } = getCloudflareContext();
        const db = drizzle(env.DB);

        // destroySession returns the stored id_token for end-session use.
        idToken = await destroySession(db, sessionId);
    }

    clearSessionCookie(headers, cfg);

    const endSessionUrl = buildEndSessionUrl(cfg, idToken);

    if (endSessionUrl) {
        headers.set('Location', endSessionUrl);
    } else {
        headers.set('Location', cfg.oktaPostLogoutRedirectUri);
    }

    return new Response(null, { status: 302, headers });
}

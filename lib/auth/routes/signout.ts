import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { getConfig } from '../config';
import { clearSessionCookie, readSessionCookie } from '../cookies';
import { destroySession } from '../session';

/**
 * POST /auth/signout
 * Local logout: destroys the D1 session row and clears the session cookie,
 * then returns the app login page as JSON so the client navigates there.
 *
 * The Okta SSO session is intentionally left intact — logout returns the user
 * to the app's own login page rather than bouncing through Okta's end-session
 * endpoint. Returns JSON (not a 302) so the client can use window.location.
 */
export async function POST(req: Request): Promise<Response> {
    const cfgResult = getConfig();
    const headers = new Headers();

    if (!cfgResult.success) {
        return Response.json({ location: '/admin/login' }, { status: 200, headers });
    }

    const cfg = cfgResult.data;
    const sessionId = readSessionCookie(req);

    if (sessionId) {
        const { env } = getCloudflareContext();
        const db = drizzle(env.DB);

        await destroySession(db, sessionId);
    }

    clearSessionCookie(headers, cfg);

    return Response.json({ location: cfg.oktaPostLogoutRedirectUri }, { status: 200, headers });
}

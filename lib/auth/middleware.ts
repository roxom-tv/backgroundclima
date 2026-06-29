import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig } from './config';
import { readSessionCookie, setSessionCookie } from './cookies';
import { signToken, verifyToken } from './session-token';

const SESSION_TTL_DAYS_FALLBACK = 7;
const MS_PER_DAY = 86_400_000;

type WithSessionResult = {
    authenticated: boolean;
    setCookie: string | null;
};

/**
 * Reads and validates the stateless signed-cookie session.
 * On success, re-issues a fresh signed cookie (sliding window renewal).
 * Returns authenticated=false with no cookie on any validation failure.
 */
export async function withSession(req: Request): Promise<WithSessionResult> {
    const tokenValue = readSessionCookie(req);

    if (!tokenValue) {
        return { authenticated: false, setCookie: null };
    }

    const { env } = getCloudflareContext();
    const secret = env.SESSION_SECRET;

    if (!secret) {
        return { authenticated: false, setCookie: null };
    }

    const now = Date.now();
    const valid = await verifyToken(tokenValue, secret, now);

    if (!valid) {
        return { authenticated: false, setCookie: null };
    }

    const cfgResult = getConfig();
    const ttlDays = cfgResult.success ? cfgResult.data.sessionTtlDays : SESSION_TTL_DAYS_FALLBACK;
    const newExpiry = now + ttlDays * MS_PER_DAY;
    const newToken = await signToken(newExpiry, secret);

    let setCookie: string | null = null;

    if (cfgResult.success) {
        const responseHeaders = new Headers();
        setSessionCookie(responseHeaders, newToken, cfgResult.data);
        setCookie = responseHeaders.get('Set-Cookie');
    }

    return { authenticated: true, setCookie };
}

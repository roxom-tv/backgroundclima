import type { Config } from './config';

const COOKIE_NAME = 'x-session-data';
const SEC_PER_DAY = 60 * 60 * 24;

function isLocalDomain(domain: string | null): boolean {
    return domain === 'localhost' || domain === '127.0.0.1';
}

/**
 * Cookie security attributes.
 * - localhost/127.0.0.1: no Secure (http dev), no Domain.
 * - explicit non-local domain: Secure + Domain=<domain>.
 * - no domain configured (null): Secure, host-only (no Domain) — safe default
 *   for https deployments on any host.
 */
function cookieSecurity(cfg: Config): { secure: string; domain: string } {
    if (isLocalDomain(cfg.cookieDomain)) {
        return { secure: '', domain: '' };
    }

    const domain = cfg.cookieDomain ? `; Domain=${cfg.cookieDomain}` : '';

    return { secure: '; Secure', domain };
}

/**
 * Appends a Set-Cookie header for the session ID to the provided Headers object.
 */
export function setSessionCookie(headers: Headers, sessionId: string, cfg: Config): void {
    const { secure, domain } = cookieSecurity(cfg);

    const cookie = [
        `${COOKIE_NAME}=${sessionId}`,
        `Max-Age=${cfg.sessionTtlDays * SEC_PER_DAY}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        domain,
        secure,
    ]
        .filter(Boolean)
        .join('; ');

    headers.append('Set-Cookie', cookie);
}

/**
 * Reads the session cookie value from an incoming Request.
 * Returns null if the cookie is absent.
 */
export function readSessionCookie(req: Request): string | null {
    const cookieHeader = req.headers.get('cookie');

    if (!cookieHeader) {
        return null;
    }

    for (const part of cookieHeader.split(';')) {
        const [rawName, ...rest] = part.split('=');
        const name = rawName.trim();

        if (name === COOKIE_NAME) {
            return rest.join('=').trim() || null;
        }
    }

    return null;
}

/**
 * Appends a Set-Cookie header that clears the session cookie.
 */
export function clearSessionCookie(headers: Headers, cfg: Config): void {
    const { secure, domain } = cookieSecurity(cfg);

    const cookie = [
        `${COOKIE_NAME}=`,
        'Max-Age=0',
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        domain,
        secure,
    ]
        .filter(Boolean)
        .join('; ');

    headers.append('Set-Cookie', cookie);
}

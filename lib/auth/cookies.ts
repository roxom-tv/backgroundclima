import type { Config } from './config';

const COOKIE_NAME = 'x-session-data';
const SEC_PER_DAY = 60 * 60 * 24;

function isProduction(domain: string): boolean {
    return domain !== 'localhost' && domain !== '127.0.0.1';
}

/**
 * Appends a Set-Cookie header for the session ID to the provided Headers object.
 */
export function setSessionCookie(headers: Headers, sessionId: string, cfg: Config): void {
    const secure = isProduction(cfg.cookieDomain) ? '; Secure' : '';
    const domain = isProduction(cfg.cookieDomain) ? `; Domain=${cfg.cookieDomain}` : '';

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
    const secure = isProduction(cfg.cookieDomain) ? '; Secure' : '';
    const domain = isProduction(cfg.cookieDomain) ? `; Domain=${cfg.cookieDomain}` : '';

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

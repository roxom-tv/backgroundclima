import { eq } from 'drizzle-orm';

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { usersTable, type User } from './schema';
import { getConfig } from './config';
import { readSessionCookie, setSessionCookie } from './cookies';
import { getSession } from './session';

type WithSessionResult = {
    user: User | null;
    setCookie: string | null;
};

const SESSION_TTL_DAYS_FALLBACK = 7;

/**
 * Reads and validates the session cookie from the request.
 * Renews the session TTL on every successful read (sliding window).
 * Returns the user (or null) and an optional Set-Cookie header string
 * to forward in the response when the session was renewed.
 */

export async function withSession(
    req: Request,
    db: DrizzleD1Database<any>,
): Promise<WithSessionResult> {
    const sessionId = readSessionCookie(req);

    if (!sessionId) {
        return { user: null, setCookie: null };
    }

    const cfgResult = getConfig();
    const ttlDays = cfgResult.success ? cfgResult.data.sessionTtlDays : SESSION_TTL_DAYS_FALLBACK;

    const now = Date.now();
    const session = await getSession(db, sessionId, now, ttlDays);

    if (!session) {
        return { user: null, setCookie: null };
    }

    const userRows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, session.user_id))
        .limit(1);

    if (userRows.length === 0 || userRows[0].is_active === 0) {
        return { user: null, setCookie: null };
    }

    const user = userRows[0];
    let setCookie: string | null = null;

    if (cfgResult.success) {
        const responseHeaders = new Headers();
        setSessionCookie(responseHeaders, session.id, cfgResult.data);
        setCookie = responseHeaders.get('Set-Cookie');
    }

    return { user, setCookie };
}

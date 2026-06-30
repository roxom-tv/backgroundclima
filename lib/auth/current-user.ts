import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { sessionsTable, usersTable, type User } from './schema';

type CookieStore = {
    get(name: string): { value: string } | undefined;
};

const COOKIE_NAME = 'x-session-data';

/**
 * Returns the authenticated User for the current request, or null if unauthenticated.
 * Accepts a cookieStore from next/headers cookies() for RSC compatibility.
 *
 * Checks expiry explicitly in addition to middleware GC — do not remove this guard.
 */
export async function getCurrentUser(
    db: DrizzleD1Database,
    cookieStore: CookieStore,
): Promise<User | null> {
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie?.value) {
        return null;
    }

    const sessionId = cookie.value;

    const rows = await db
        .select({
            user: usersTable,
            expires_at: sessionsTable.expires_at,
        })
        .from(sessionsTable)
        .innerJoin(usersTable, eq(sessionsTable.user_id, usersTable.id))
        .where(eq(sessionsTable.id, sessionId))
        .limit(1);

    if (rows.length === 0) {
        return null;
    }

    const { user, expires_at } = rows[0];

    if (expires_at < Date.now()) {
        return null;
    }

    if (user.is_active === 0) {
        return null;
    }

    return user;
}

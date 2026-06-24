import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { sessionsTable, type Session } from './schema';
import type { TrackingData } from './state';

const MS_PER_DAY = 86_400_000;

function generateSessionId(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Creates a new session row in D1 and returns the opaque session ID.
 * Stores the validated id_token for use in Okta end-session (id_token_hint).
 */
export async function createSession(
    db: DrizzleD1Database,
    userId: string,
    tracking: TrackingData | null,
    idToken: string,
    now: number,
    ttlDays: number,
): Promise<string> {
    const id = generateSessionId();
    const expiresAt = now + ttlDays * MS_PER_DAY;

    await db.insert(sessionsTable).values({
        id,
        user_id: userId,
        tracking: tracking ? JSON.stringify(tracking) : null,
        id_token: idToken,
        created_at: now,
        expires_at: expiresAt,
    });

    return id;
}

/**
 * Looks up a session by ID, validates expiry, and slides the expiration window on read.
 * Returns null if the session is missing or expired.
 */
export async function getSession(
    db: DrizzleD1Database,
    id: string,
    now: number,
    ttlDays: number,
): Promise<Session | null> {
    const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id)).limit(1);

    if (rows.length === 0) {
        return null;
    }

    const session = rows[0];

    if (session.expires_at < now) {
        await db.delete(sessionsTable).where(eq(sessionsTable.id, id));

        return null;
    }

    const window = ttlDays * MS_PER_DAY;

    // Skip the write on every request: only slide once past the half-life.
    if (session.expires_at - now >= window / 2) {
        return session;
    }

    const newExpiresAt = now + window;

    await db
        .update(sessionsTable)
        .set({ expires_at: newExpiresAt })
        .where(eq(sessionsTable.id, id));

    return { ...session, expires_at: newExpiresAt };
}

/**
 * Deletes a session row and returns its id_token (for Okta end-session hint).
 * Returns null if the session did not exist.
 */
export async function destroySession(db: DrizzleD1Database, id: string): Promise<string | null> {
    const rows = await db
        .delete(sessionsTable)
        .where(eq(sessionsTable.id, id))
        .returning({ id_token: sessionsTable.id_token });

    return rows.length > 0 ? (rows[0].id_token ?? null) : null;
}

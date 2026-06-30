import { lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { sessionsTable, oauthStatesTable } from './schema';

type CleanupResult = {
    sessions: number;
    states: number;
};

/**
 * Deletes all expired session and oauth_state rows from D1.
 * Intended to be called from a Cloudflare Workers scheduled cron trigger.
 * Returns the count of deleted rows per table.
 */
export async function cleanup(db: DrizzleD1Database, now: number): Promise<CleanupResult> {
    const deletedSessions = await db
        .delete(sessionsTable)
        .where(lt(sessionsTable.expires_at, now))
        .returning({ id: sessionsTable.id });

    const deletedStates = await db
        .delete(oauthStatesTable)
        .where(lt(oauthStatesTable.expires_at, now))
        .returning({ state: oauthStatesTable.state });

    return {
        sessions: deletedSessions.length,
        states: deletedStates.length,
    };
}

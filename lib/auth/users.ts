import { eq, like, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { usersTable, type User } from './schema';
import type { OktaUserInfo } from './okta';

type Result<T> = { success: true; data: T } | { success: false; error: string };

const MEMBER_ID_MAX_RETRIES = 5;

/**
 * Generates a unique member ID in the sequential format RXM-YYYY-NNNN.
 * Reads the current max NNNN for the year, increments, and retries on
 * UNIQUE conflicts from concurrent inserts.
 * Note: NNNN is 4 digits — caps at 9999 members per year.
 */
export async function generateMemberId(db: DrizzleD1Database, now: number): Promise<string> {
    const year = new Date(now).getUTCFullYear();
    const prefix = `RXM-${year}-`;

    for (let attempt = 0; attempt < MEMBER_ID_MAX_RETRIES; attempt++) {
        const next = (await currentMaxSuffix(db, prefix)) + 1 + attempt;
        const candidate = `${prefix}${next.toString().padStart(4, '0')}`;

        const existing = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.member_id, candidate))
            .limit(1);

        if (existing.length === 0) {
            return candidate;
        }
    }

    throw new Error('Failed to generate unique member_id after max retries');
}

/**
 * Returns the highest NNNN suffix currently issued for the given year prefix, or 0.
 */
async function currentMaxSuffix(db: DrizzleD1Database, prefix: string): Promise<number> {
    const rows = await db
        .select({ member_id: usersTable.member_id })
        .from(usersTable)
        .where(like(usersTable.member_id, `${prefix}%`))
        .orderBy(desc(usersTable.member_id))
        .limit(1);

    if (rows.length === 0 || !rows[0].member_id) {
        return 0;
    }

    const suffix = parseInt(rows[0].member_id.slice(prefix.length), 10);

    return Number.isNaN(suffix) ? 0 : suffix;
}

/**
 * Upserts a user by Okta sub or email.
 * Rejects login when is_active = 0.
 * Returns the user record and whether this was a first-time sign-in.
 *
 * The email_verified and allowlist checks are the caller's responsibility
 * (performed in the callback handler before this function is called).
 */
export async function upsertOktaUser(
    db: DrizzleD1Database,
    userinfo: OktaUserInfo,
    now: number,
): Promise<Result<{ user: User; isNew: boolean }>> {
    // 1. Match by okta_sub (fastest path for returning users).
    const bySubRows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.okta_sub, userinfo.sub))
        .limit(1);

    if (bySubRows.length > 0) {
        const existing = bySubRows[0];

        if (existing.is_active === 0) {
            return { success: false, error: 'Account is deactivated' };
        }

        const updated = await db
            .update(usersTable)
            .set({
                full_name: userinfo.name,
                avatar_url: userinfo.picture ?? null,
                last_sign_in_at: now,
            })
            .where(eq(usersTable.id, existing.id))
            .returning();

        return { success: true, data: { user: updated[0], isNew: false } };
    }

    // 2. Match by email — links okta_sub to a pre-existing account.
    const byEmailRows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, userinfo.email))
        .limit(1);

    if (byEmailRows.length > 0) {
        const existing = byEmailRows[0];

        if (existing.is_active === 0) {
            return { success: false, error: 'Account is deactivated' };
        }

        const updated = await db
            .update(usersTable)
            .set({
                okta_sub: userinfo.sub,
                full_name: userinfo.name,
                avatar_url: userinfo.picture ?? null,
                last_sign_in_at: now,
            })
            .where(eq(usersTable.id, existing.id))
            .returning();

        return { success: true, data: { user: updated[0], isNew: false } };
    }

    // 3. New user.
    const id = crypto.randomUUID();
    const memberId = await generateMemberId(db, now);

    const inserted = await db
        .insert(usersTable)
        .values({
            id,
            email: userinfo.email,
            okta_sub: userinfo.sub,
            full_name: userinfo.name,
            avatar_url: userinfo.picture ?? null,
            member_id: memberId,
            created_at: now,
            last_sign_in_at: now,
        })
        .returning();

    return { success: true, data: { user: inserted[0], isNew: true } };
}

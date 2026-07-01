import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { cookies } from 'next/headers';
import { getCurrentUser } from '../current-user';

/**
 * GET /api/me
 * Returns the authenticated user's profile as JSON, or 401 if unauthenticated.
 */
export async function GET(): Promise<Response> {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const cookieStore = await cookies();

    const user = await getCurrentUser(db, cookieStore);

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ user }, { status: 200 });
}

import { getCloudflareContext } from '@opennextjs/cloudflare';

export type Config = {
    cookieDomain: string;
    sessionTtlDays: number;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

const DEFAULT_SESSION_TTL_DAYS = 7;

/**
 * Reads cookie and session configuration from Cloudflare Workers env bindings.
 * Returns a Result — callers must handle the failure case before using Config.
 */
export function getConfig(): Result<Config> {
    const { env } = getCloudflareContext();

    if (!env.COOKIE_DOMAIN) {
        return { success: false, error: 'Missing required env var: COOKIE_DOMAIN' };
    }

    const sessionTtlDays = env.SESSION_TTL_DAYS
        ? parseInt(env.SESSION_TTL_DAYS as string, 10)
        : DEFAULT_SESSION_TTL_DAYS;

    return {
        success: true,
        data: {
            cookieDomain: env.COOKIE_DOMAIN as string,
            sessionTtlDays,
        },
    };
}

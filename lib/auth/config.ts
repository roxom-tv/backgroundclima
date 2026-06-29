import { getCloudflareContext } from '@opennextjs/cloudflare';

export type Config = {
    /**
     * Optional explicit cookie Domain. When unset, the session cookie is
     * host-only (no Domain attribute) — which works on any single host
     * (localhost, *.workers.dev, custom domain) without configuration.
     */
    cookieDomain: string | null;
    sessionTtlDays: number;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

const DEFAULT_SESSION_TTL_DAYS = 7;

/**
 * Reads cookie and session configuration from Cloudflare Workers env bindings.
 * COOKIE_DOMAIN is optional; when absent the cookie is issued host-only.
 * Always succeeds (Result kept for caller-shape compatibility).
 */
export function getConfig(): Result<Config> {
    const { env } = getCloudflareContext();

    const sessionTtlDays = env.SESSION_TTL_DAYS
        ? parseInt(env.SESSION_TTL_DAYS as string, 10)
        : DEFAULT_SESSION_TTL_DAYS;

    return {
        success: true,
        data: {
            cookieDomain: (env.COOKIE_DOMAIN as string | undefined) ?? null,
            sessionTtlDays,
        },
    };
}

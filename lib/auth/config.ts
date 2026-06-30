import { getCloudflareContext } from '@opennextjs/cloudflare';

export type Config = {
    oktaClientId: string;
    oktaClientSecret: string;
    oktaIssuer: string;
    oktaCallbackUrl: string;
    oktaRedirectUrl: string;
    oktaPostLogoutRedirectUri: string;
    allowedEmails: ReadonlySet<string>;
    cookieDomain: string;
    sessionTtlDays: number;
    stateTtlSec: number;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

const DEFAULT_SESSION_TTL_DAYS = 7;
const DEFAULT_STATE_TTL_SEC = 600;

/**
 * Reads and validates all required configuration from Cloudflare Workers env bindings.
 * Returns a Result — callers must handle the failure case before using Config.
 */
export function getConfig(): Result<Config> {
    const { env } = getCloudflareContext();

    const required = [
        'OKTA_CLIENT_ID',
        'OKTA_CLIENT_SECRET',
        'OKTA_ISSUER',
        'OKTA_CALLBACK_URL',
        'OKTA_REDIRECT_URL',
        'OKTA_POST_LOGOUT_REDIRECT_URI',
        'OKTA_ALLOWED_EMAILS',
        'COOKIE_DOMAIN',
    ] as const;

    for (const key of required) {
        if (!env[key]) {
            return { success: false, error: `Missing required env var: ${key}` };
        }
    }

    const allowedEmails = parseAllowedEmails(env['OKTA_ALLOWED_EMAILS'] as string);

    if (allowedEmails.size === 0) {
        return { success: false, error: 'OKTA_ALLOWED_EMAILS must contain at least one email' };
    }

    const sessionTtlDays = env['SESSION_TTL_DAYS']
        ? parseInt(env['SESSION_TTL_DAYS'] as string, 10)
        : DEFAULT_SESSION_TTL_DAYS;

    const stateTtlSec = env['STATE_TTL_SEC']
        ? parseInt(env['STATE_TTL_SEC'] as string, 10)
        : DEFAULT_STATE_TTL_SEC;

    return {
        success: true,
        data: {
            oktaClientId: env['OKTA_CLIENT_ID'] as string,
            oktaClientSecret: env['OKTA_CLIENT_SECRET'] as string,
            oktaIssuer: env['OKTA_ISSUER'] as string,
            oktaCallbackUrl: env['OKTA_CALLBACK_URL'] as string,
            oktaRedirectUrl: env['OKTA_REDIRECT_URL'] as string,
            oktaPostLogoutRedirectUri: env['OKTA_POST_LOGOUT_REDIRECT_URI'] as string,
            allowedEmails,
            cookieDomain: env['COOKIE_DOMAIN'] as string,
            sessionTtlDays,
            stateTtlSec,
        },
    };
}

/**
 * Parses a comma-separated email list into a lowercase Set.
 * Exposed so it can be unit-tested without env access.
 */
export function parseAllowedEmails(raw: string): ReadonlySet<string> {
    const emails = raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

    return new Set(emails);
}

/**
 * Returns true if the provided email is in the allowlist.
 * Pure function — no side effects, accepts `now` param pattern from rest of kit.
 */
export function isAllowed(email: string, allowlist: ReadonlySet<string>): boolean {
    return allowlist.has(email.toLowerCase());
}

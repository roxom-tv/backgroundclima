import { eq, lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { oauthStatesTable } from './schema';

export type TrackingData = {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    gclid?: string;
    fbclid?: string;
    twclid?: string;
    ttclid?: string;
    referral?: string;
};

/**
 * Payload stored server-side in the oauth_states table per OIDC flow initiation.
 * codeVerifier and nonce are NEVER sent to the browser — they persist here for the
 * callback to retrieve and use in PKCE token exchange and id_token claim validation.
 */
export type StatePayload = {
    codeVerifier: string;
    nonce: string;
    sessionId?: string;
    tracking?: TrackingData;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

function generateHex(byteCount: number): string {
    const bytes = new Uint8Array(byteCount);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Generates a PKCE code_verifier (43-128 chars, base64url alphabet per RFC 7636).
 * Uses 32 random bytes encoded as base64url, which yields 43 chars.
 */
export function generateCodeVerifier(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return base64urlEncode(bytes);
}

/**
 * Computes the PKCE code_challenge: base64url(SHA-256(verifier)).
 * Uses Web Crypto API only — no Node crypto.
 */
export async function computeCodeChallenge(verifier: string): Promise<string> {
    const encoded = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return base64urlEncode(new Uint8Array(digest));
}

/**
 * Generates a cryptographically random nonce (hex, 32 bytes = 64 chars).
 */
export function generateNonce(): string {
    return generateHex(32);
}

/**
 * Base64url-encodes a Uint8Array without padding (per RFC 4648 §5).
 */
export function base64urlEncode(bytes: Uint8Array): string {
    let binary = '';

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decodes a base64url-encoded string to a Uint8Array.
 */
export function base64urlDecode(input: string): Uint8Array {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/**
 * Creates a cryptographically random OAuth CSRF state token and persists the full
 * StatePayload (including PKCE codeVerifier and nonce) to D1.
 * Returns the state string to embed in the authorization URL.
 */
export async function createState(
    db: DrizzleD1Database,
    payload: StatePayload,
    now: number,
    ttlSec: number,
): Promise<string> {
    const state = generateHex(32);
    const expiresAt = now + ttlSec * 1000;

    await db.insert(oauthStatesTable).values({
        state,
        payload: JSON.stringify(payload),
        expires_at: expiresAt,
    });

    return state;
}

/**
 * Validates and consumes an OAuth state token (single-use).
 * Deletes expired states as a side-effect on each call.
 * Returns the full StatePayload if found and not expired, or a failure result.
 */
export async function consumeState(
    db: DrizzleD1Database,
    state: string,
    now: number,
): Promise<Result<StatePayload>> {
    await db.delete(oauthStatesTable).where(lt(oauthStatesTable.expires_at, now));

    const rows = await db
        .delete(oauthStatesTable)
        .where(eq(oauthStatesTable.state, state))
        .returning();

    if (rows.length === 0) {
        return { success: false, error: 'State not found or expired' };
    }

    const row = rows[0];

    if (row.expires_at < now) {
        return { success: false, error: 'State expired' };
    }

    if (!row.payload) {
        return { success: false, error: 'State payload missing' };
    }

    const payload = JSON.parse(row.payload) as StatePayload;

    return { success: true, data: payload };
}

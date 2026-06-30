import type { Config } from './config';
import { base64urlDecode, base64urlEncode } from './state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OktaTokenResponse = {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
};

export type OktaUserInfo = {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    preferred_username?: string;
    picture?: string;
    groups?: string[];
};

/**
 * Claims extracted from the validated id_token.
 * Identity is derived from the id_token (not userinfo) — userinfo is optional enrichment.
 */
export type OktaIdTokenClaims = {
    sub: string;
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    nonce: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    preferred_username?: string;
    picture?: string;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

// ---------------------------------------------------------------------------
// JWKS in-memory cache (per isolate lifetime)
// ---------------------------------------------------------------------------

type JwkEntry = {
    kid: string;
    key: CryptoKey;
};

let jwksCache: JwkEntry[] | null = null;

// ---------------------------------------------------------------------------
// Endpoint helpers (derived from issuer)
// ---------------------------------------------------------------------------

/**
 * Base URL for the OAuth/OIDC endpoints (`/v1/authorize`, `/token`, `/keys`, …).
 *
 * Okta org authorization server: issuer = `https://org.okta.com`, but its
 * endpoints live under `/oauth2/v1/*` and the id_token `iss` is the bare origin.
 * Custom authorization servers: issuer = `https://org.okta.com/oauth2/<id>` and
 * endpoints are `<issuer>/v1/*`, with `iss` === issuer.
 *
 * So endpoints must be built from a base that includes `/oauth2`, while `iss`
 * validation stays against the raw issuer. When the issuer already contains an
 * `/oauth2` path segment (custom AS) we use it verbatim; otherwise (org server)
 * we insert `/oauth2`.
 */
function endpointBase(cfg: Config): string {
    const issuer = cfg.oktaIssuer.replace(/\/+$/, '');

    try {
        const { pathname } = new URL(issuer);

        if (pathname.includes('/oauth2')) {
            return issuer;
        }
    } catch {
        // fall through to the org-server default below
    }

    return `${issuer}/oauth2`;
}

/** Authorization endpoint for OIDC flow initiation. */
export function authorizeUrl(cfg: Config): string {
    return `${endpointBase(cfg)}/v1/authorize`;
}

/** Token endpoint for authorization code exchange. */
export function tokenUrl(cfg: Config): string {
    return `${endpointBase(cfg)}/v1/token`;
}

/** UserInfo endpoint for optional enrichment after id_token validation. */
export function userInfoUrl(cfg: Config): string {
    return `${endpointBase(cfg)}/v1/userinfo`;
}

/** JWKS endpoint for id_token signature verification. */
export function jwksUrl(cfg: Config): string {
    return `${endpointBase(cfg)}/v1/keys`;
}

/**
 * End-session endpoint. Builds the full URL with id_token_hint and post_logout_redirect_uri.
 * Returns null when no id_token is available — caller falls back to local-only logout.
 */
export function buildEndSessionUrl(cfg: Config, idToken: string | null): string | null {
    if (!idToken) {
        return null;
    }

    const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: cfg.oktaPostLogoutRedirectUri,
    });

    return `${endpointBase(cfg)}/v1/logout?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Authorization URL builder
// ---------------------------------------------------------------------------

/**
 * Builds the Okta OIDC authorization URL with PKCE (S256) and a nonce.
 * The code_verifier and nonce are NOT embedded here — they are persisted
 * server-side in the oauth_states table before this URL is built.
 */
export function buildAuthUrl(
    cfg: Config,
    state: string,
    codeChallenge: string,
    nonce: string,
): string {
    const params = new URLSearchParams({
        client_id: cfg.oktaClientId,
        redirect_uri: cfg.oktaCallbackUrl,
        response_type: 'code',
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return `${authorizeUrl(cfg)}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchanges an authorization code for Okta tokens.
 * Includes code_verifier for PKCE — retrieved from the consumed state payload.
 * client_secret is included for confidential client (Workers backend).
 */
export async function exchangeCode(
    cfg: Config,
    code: string,
    codeVerifier: string,
): Promise<Result<OktaTokenResponse>> {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: cfg.oktaCallbackUrl,
        client_id: cfg.oktaClientId,
        client_secret: cfg.oktaClientSecret,
        code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl(cfg), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const text = await response.text();

        return { success: false, error: `Token exchange failed: ${text}` };
    }

    const data = (await response.json()) as OktaTokenResponse;

    return { success: true, data };
}

// ---------------------------------------------------------------------------
// JWKS fetch and key lookup
// ---------------------------------------------------------------------------

type RawJwk = {
    kty: string;
    kid: string;
    use?: string;
    alg?: string;
    n: string;
    e: string;
};

type JwksResponse = {
    keys: RawJwk[];
};

async function fetchJwks(url: string): Promise<RawJwk[]> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as JwksResponse;

    return data.keys;
}

/**
 * Returns the CryptoKey for a given kid, using the in-memory per-isolate cache.
 * Fetches and imports all RS256 keys on first call; returns cached on subsequent calls.
 * If the kid is not in the cache, attempts a single re-fetch (handles key rotation).
 */
async function getSigningKey(jwksEndpoint: string, kid: string): Promise<CryptoKey | null> {
    const findInCache = (entries: JwkEntry[]): CryptoKey | null =>
        entries.find((e) => e.kid === kid)?.key ?? null;

    if (jwksCache !== null) {
        const cached = findInCache(jwksCache);

        if (cached) {
            return cached;
        }
    }

    // Cache miss or stale — fetch and re-import.
    const rawKeys = await fetchJwks(jwksEndpoint);
    const entries = await importRsaKeys(rawKeys);
    jwksCache = entries;

    return findInCache(entries) ?? null;
}

async function importRsaKeys(rawKeys: RawJwk[]): Promise<JwkEntry[]> {
    const results: JwkEntry[] = [];

    for (const raw of rawKeys) {
        if (raw.kty !== 'RSA' || (raw.alg && raw.alg !== 'RS256')) {
            continue;
        }

        // kid is not part of the JsonWebKey standard type but is valid JWK data;
        // cast to the expected type to satisfy strict CF Workers typings.
        const jwkData: JsonWebKey = {
            kty: raw.kty,
            use: raw.use ?? 'sig',
            alg: 'RS256',
            n: raw.n,
            e: raw.e,
        };

        const key = await crypto.subtle.importKey(
            'jwk',
            jwkData,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['verify'],
        );

        results.push({ kid: raw.kid, key });
    }

    return results;
}

// ---------------------------------------------------------------------------
// id_token validation
// ---------------------------------------------------------------------------

type JwtHeader = {
    alg: string;
    kid: string;
};

/**
 * Validates the Okta id_token fully:
 * 1. Decodes header to get kid + alg.
 * 2. Fetches/caches the JWK for that kid.
 * 3. Verifies the RS256 signature with Web Crypto.
 * 4. Validates iss, aud, exp, iat, nonce claims.
 * 5. Rejects only if email_verified is explicitly false (absent claim is allowed).
 *
 * Accepts `now` in milliseconds so tests can inject a fixed time.
 * Returns the validated claims on success, or a failure result.
 */
export async function validateIdToken(
    cfg: Config,
    idToken: string,
    expectedNonce: string,
    now: number,
    jwksEndpoint: string,
): Promise<Result<OktaIdTokenClaims>> {
    const parts = idToken.split('.');

    if (parts.length !== 3) {
        return { success: false, error: 'id_token: malformed JWT' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: JwtHeader;

    try {
        header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64))) as JwtHeader;
    } catch {
        return { success: false, error: 'id_token: failed to decode header' };
    }

    if (header.alg !== 'RS256') {
        return { success: false, error: `id_token: unsupported algorithm ${header.alg}` };
    }

    if (!header.kid) {
        return { success: false, error: 'id_token: missing kid in header' };
    }

    const signingKey = await getSigningKey(jwksEndpoint, header.kid);

    if (!signingKey) {
        return { success: false, error: `id_token: no key found for kid ${header.kid}` };
    }

    const signingInputBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64urlDecode(signatureB64);

    // Cast to ArrayBuffer to satisfy CF Workers strict BufferSource typings.
    const valid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        signingKey,
        signatureBytes.buffer as ArrayBuffer,
        signingInputBytes.buffer as ArrayBuffer,
    );

    if (!valid) {
        return { success: false, error: 'id_token: signature verification failed' };
    }

    let claims: OktaIdTokenClaims;

    try {
        claims = JSON.parse(
            new TextDecoder().decode(base64urlDecode(payloadB64)),
        ) as OktaIdTokenClaims;
    } catch {
        return { success: false, error: 'id_token: failed to decode payload' };
    }

    const nowSec = Math.floor(now / 1000);

    if (claims.iss !== cfg.oktaIssuer) {
        return {
            success: false,
            error: `id_token: iss mismatch (got ${claims.iss}, expected ${cfg.oktaIssuer})`,
        };
    }

    if (claims.aud !== cfg.oktaClientId) {
        return {
            success: false,
            error: `id_token: aud mismatch (got ${claims.aud}, expected ${cfg.oktaClientId})`,
        };
    }

    if (claims.exp <= nowSec) {
        return { success: false, error: 'id_token: token expired' };
    }

    // Reject tokens issued too far in the past or future (5-minute skew allowance).
    const MAX_SKEW_SEC = 300;

    if (Math.abs(nowSec - claims.iat) > MAX_SKEW_SEC) {
        return { success: false, error: 'id_token: iat is outside acceptable skew' };
    }

    if (claims.nonce !== expectedNonce) {
        return { success: false, error: 'id_token: nonce mismatch' };
    }

    // Reject only an explicit `false`. Okta org authorization servers omit the
    // email_verified claim entirely (undefined); identity is still pinned by the
    // signed id_token + the downstream email allowlist, so an absent claim is
    // treated as acceptable for this internal-tools kit.
    if (claims.email_verified === false) {
        return { success: false, error: 'id_token: email not verified' };
    }

    return { success: true, data: claims };
}

// ---------------------------------------------------------------------------
// Optional userinfo enrichment
// ---------------------------------------------------------------------------

/**
 * Fetches additional profile fields from the Okta userinfo endpoint.
 * Optional — identity is already established from the validated id_token.
 * Only call this when you need fields (e.g. groups) not present in the id_token.
 */
export async function fetchUserInfo(
    cfg: Config,
    accessToken: string,
): Promise<Result<OktaUserInfo>> {
    const response = await fetch(userInfoUrl(cfg), {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const text = await response.text();

        return { success: false, error: `Userinfo fetch failed: ${text}` };
    }

    const data = (await response.json()) as OktaUserInfo;

    return { success: true, data };
}

// ---------------------------------------------------------------------------
// Identity derived from validated claims
// ---------------------------------------------------------------------------

/**
 * Normalises id_token claims into the canonical OktaUserInfo shape.
 * Avoids a round-trip to the userinfo endpoint for standard flows.
 */
export function identityFromClaims(claims: OktaIdTokenClaims): OktaUserInfo {
    return {
        sub: claims.sub,
        email: claims.email ?? '',
        email_verified: claims.email_verified ?? false,
        name: claims.name ?? claims.preferred_username ?? claims.sub,
        preferred_username: claims.preferred_username,
        picture: claims.picture,
    };
}

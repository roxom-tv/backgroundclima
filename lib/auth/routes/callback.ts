import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { getConfig, isAllowed } from '../config';
import { exchangeCode, identityFromClaims, jwksUrl, validateIdToken } from '../okta';
import { consumeState } from '../state';
import { upsertOktaUser } from '../users';
import { createSession } from '../session';
import { setSessionCookie } from '../cookies';

/**
 * GET /auth/okta/callback
 * Handles the OIDC redirect from Okta after user authentication.
 *
 * Security gates (in order):
 *  1. CSRF state validation (single-use, time-bounded).
 *  2. Authorization code exchange with PKCE code_verifier.
 *  3. id_token RS256 signature verification via JWKS.
 *  4. id_token claims: iss, aud, exp, iat, nonce, email_verified.
 *  5. Email allowlist — rejects non-allowlisted identities.
 *  6. Account active check (is_active flag).
 *
 * Only after all gates pass is a session created and a cookie set.
 */
export async function GET(req: Request): Promise<Response> {
    const cfgResult = getConfig();

    if (!cfgResult.success) {
        return Response.json({ error: cfgResult.error }, { status: 500 });
    }

    const cfg = cfgResult.data;
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
        return Response.redirect(cfg.oktaRedirectUrl, 302);
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const now = Date.now();

    // Gate 1: Validate and consume the CSRF state. Retrieves codeVerifier + nonce.
    const stateResult = await consumeState(db, state, now);

    if (!stateResult.success) {
        return Response.redirect(cfg.oktaRedirectUrl, 302);
    }

    const { codeVerifier, nonce, tracking } = stateResult.data;

    // Gate 2: Exchange code for tokens using PKCE verifier.
    const tokenResult = await exchangeCode(cfg, code, codeVerifier);

    if (!tokenResult.success) {
        return Response.redirect(cfg.oktaRedirectUrl, 302);
    }

    const { id_token: idToken } = tokenResult.data;

    // Gate 3 + 4: Validate id_token signature and claims.
    const claimsResult = await validateIdToken(cfg, idToken, nonce, now, jwksUrl(cfg));

    if (!claimsResult.success) {
        return Response.redirect(cfg.oktaRedirectUrl, 302);
    }

    const claims = claimsResult.data;
    const identity = identityFromClaims(claims);

    // Gate 5: Email allowlist — this kit is for internal tools only.
    if (!isAllowed(identity.email, cfg.allowedEmails)) {
        return Response.redirect(`${cfg.oktaRedirectUrl}?error=access_denied`, 302);
    }

    // Gate 6: Upsert user (checks is_active internally).
    const upsertResult = await upsertOktaUser(db, identity, now);

    if (!upsertResult.success) {
        return Response.redirect(cfg.oktaRedirectUrl, 302);
    }

    const { user, isNew } = upsertResult.data;

    // All gates passed — create session and set cookie.
    const sessionId = await createSession(
        db,
        user.id,
        tracking ?? null,
        idToken,
        now,
        cfg.sessionTtlDays,
    );

    const headers = new Headers();
    setSessionCookie(headers, sessionId, cfg);

    const redirectUrl = new URL(cfg.oktaRedirectUrl);
    redirectUrl.searchParams.set('newUser', isNew ? 'true' : 'false');
    headers.set('Location', redirectUrl.toString());

    return new Response(null, { status: 302, headers });
}

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { getConfig } from '../config';
import { buildAuthUrl } from '../okta';
import { computeCodeChallenge, createState, generateCodeVerifier, generateNonce } from '../state';

/**
 * GET /auth/okta
 * Initiates the Okta OIDC authorization code + PKCE flow.
 * Generates code_verifier, nonce, and CSRF state — all persisted server-side in D1.
 * Returns JSON { location } with HTTP 200 so the client can redirect.
 */
export async function GET(req: Request): Promise<Response> {
    const cfgResult = getConfig();

    if (!cfgResult.success) {
        return Response.json({ error: cfgResult.error }, { status: 500 });
    }

    const cfg = cfgResult.data;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    const url = new URL(req.url);
    const tracking = {
        utm_source: url.searchParams.get('utm_source') ?? undefined,
        utm_medium: url.searchParams.get('utm_medium') ?? undefined,
        utm_campaign: url.searchParams.get('utm_campaign') ?? undefined,
        gclid: url.searchParams.get('gclid') ?? undefined,
        fbclid: url.searchParams.get('fbclid') ?? undefined,
        twclid: url.searchParams.get('twclid') ?? undefined,
        ttclid: url.searchParams.get('ttclid') ?? undefined,
        referral: url.searchParams.get('referral') ?? undefined,
    };

    // PKCE: generate verifier + challenge. Verifier stays server-side.
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);

    // Nonce for id_token claim binding. Stays server-side.
    const nonce = generateNonce();

    const now = Date.now();

    const state = await createState(db, { codeVerifier, nonce, tracking }, now, cfg.stateTtlSec);

    const location = buildAuthUrl(cfg, state, codeChallenge, nonce);

    return Response.json({ location }, { status: 200 });
}

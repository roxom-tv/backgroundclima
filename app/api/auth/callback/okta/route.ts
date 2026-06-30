/**
 * GET /api/auth/callback/okta
 * Handles the Okta OIDC redirect: validates CSRF state, exchanges authorization
 * code (PKCE), validates id_token via JWKS, enforces email allowlist, and
 * issues a session cookie on success.
 * Delegates entirely to the vendored auth kit handler.
 */
export { oktaCallbackHandler as GET } from '@/lib/auth/index';

/**
 * POST /auth/signout
 * Destroys the server-side D1 session, clears the session cookie, and
 * redirects to Okta's end-session endpoint (two-phase logout).
 * Delegates entirely to the vendored auth kit handler.
 */
export { signoutHandler as POST } from '@/lib/auth/index';

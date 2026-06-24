/**
 * GET /api/me
 * Returns the current authenticated user's profile as JSON, or 401 if
 * unauthenticated. Session is read from the HttpOnly cookie.
 * Delegates entirely to the vendored auth kit handler.
 */
export { meHandler as GET } from '@/lib/auth/index';

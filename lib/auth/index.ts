// Types
export type { User, NewUser, Session, NewSession, OAuthState } from './schema';
export type { Config } from './config';
export type { OktaUserInfo, OktaTokenResponse, OktaIdTokenClaims } from './okta';
export type { TrackingData, StatePayload } from './state';

// Core functions
export { getCurrentUser } from './current-user';
export { withSession } from './middleware';
export { getConfig, parseAllowedEmails, isAllowed } from './config';
export { upsertOktaUser, generateMemberId } from './users';
export { createSession, getSession, destroySession } from './session';
export {
    createState,
    consumeState,
    generateCodeVerifier,
    computeCodeChallenge,
    generateNonce,
    base64urlEncode,
    base64urlDecode,
} from './state';
export { setSessionCookie, readSessionCookie, clearSessionCookie } from './cookies';
export {
    buildAuthUrl,
    buildEndSessionUrl,
    exchangeCode,
    validateIdToken,
    fetchUserInfo,
    identityFromClaims,
    authorizeUrl,
    tokenUrl,
    userInfoUrl,
    jwksUrl,
} from './okta';

// Cron utility
export { cleanup } from './cleanup';

// Route handlers (consumer-friendly aliases)
export { GET as oktaAuthHandler } from './routes/okta';
export { GET as oktaCallbackHandler } from './routes/callback';
export { POST as signoutHandler } from './routes/signout';
export { GET as meHandler } from './routes/me';

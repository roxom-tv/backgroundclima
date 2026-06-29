import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { signToken } from './session-token';
import { withSession } from './middleware';

const SECRET = 'test-secret-middleware-xyz';
const ALT_SECRET = 'different-secret-abc';
const COOKIE_NAME = 'x-session-data';

function makeRequest(cookieValue?: string): Request {
    const headers: Record<string, string> = {};

    if (cookieValue !== undefined) {
        headers['cookie'] = `${COOKIE_NAME}=${cookieValue}`;
    }

    return new Request('http://localhost/', { headers });
}

function mockCtx(env: Record<string, string | undefined>): void {
    vi.mocked(getCloudflareContext).mockReturnValue({ env } as unknown as ReturnType<
        typeof getCloudflareContext
    >);
}

describe('withSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('no cookie', () => {
        it('returns authenticated:false and setCookie:null when no cookie header is present', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const result = await withSession(new Request('http://localhost/'));
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });
    });

    describe('missing SESSION_SECRET env', () => {
        it('returns authenticated:false when SESSION_SECRET is absent', async () => {
            mockCtx({});
            const token = await signToken(Date.now() + 60_000, SECRET);
            const result = await withSession(makeRequest(token));
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });
    });

    describe('valid unexpired token', () => {
        it('returns authenticated:true with a non-null setCookie (sliding renewal)', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const token = await signToken(Date.now() + 60_000, SECRET);
            const result = await withSession(makeRequest(token));
            expect(result.authenticated).toBe(true);
            expect(result.setCookie).not.toBeNull();
        });

        it('renewed cookie contains the x-session-data cookie name', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const token = await signToken(Date.now() + 60_000, SECRET);
            const result = await withSession(makeRequest(token));
            expect(result.setCookie).toContain(`${COOKIE_NAME}=`);
        });

        it('renewed cookie carries standard attributes (HttpOnly, SameSite=Lax, Path=/)', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const token = await signToken(Date.now() + 60_000, SECRET);
            const result = await withSession(makeRequest(token));
            expect(result.setCookie).toContain('HttpOnly');
            expect(result.setCookie).toContain('SameSite=Lax');
            expect(result.setCookie).toContain('Path=/');
        });
    });

    describe('expired token', () => {
        it('returns authenticated:false for a token whose expiry is in the past', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const expiredToken = await signToken(Date.now() - 1_000, SECRET);
            const result = await withSession(makeRequest(expiredToken));
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });
    });

    describe('wrong secret', () => {
        it('returns authenticated:false when the token was signed with a different secret', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const token = await signToken(Date.now() + 60_000, ALT_SECRET);
            const result = await withSession(makeRequest(token));
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });
    });

    describe('malformed cookie', () => {
        it('returns authenticated:false without throwing for a non-token string', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            const result = await withSession(makeRequest('not-a-valid-token'));
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });

        it('returns authenticated:false without throwing for an empty cookie value', async () => {
            mockCtx({ SESSION_SECRET: SECRET });
            // empty value → readSessionCookie returns null → early return
            const req = new Request('http://localhost/', {
                headers: { cookie: `${COOKIE_NAME}=` },
            });
            const result = await withSession(req);
            expect(result.authenticated).toBe(false);
            expect(result.setCookie).toBeNull();
        });
    });
});

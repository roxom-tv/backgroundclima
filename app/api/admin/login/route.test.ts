import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POST } from './route';

function mockCtx(env: Record<string, string | undefined>): void {
    vi.mocked(getCloudflareContext).mockReturnValue({ env } as unknown as ReturnType<
        typeof getCloudflareContext
    >);
}

function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

const FULL_ENV = {
    ADMIN_PASSWORD: 'correct-password',
    SESSION_SECRET: 'test-session-secret',
} as const;

describe('POST /api/admin/login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('invalid request body', () => {
        it('returns 400 when the body is not valid JSON', async () => {
            mockCtx(FULL_ENV);
            const req = new Request('http://localhost/api/admin/login', {
                method: 'POST',
                body: 'not-json',
            });
            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('returns 400 when the body has no password field', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ username: 'admin' }));
            expect(response.status).toBe(400);
        });

        it('returns 400 when password is an empty string', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: '' }));
            expect(response.status).toBe(400);
        });

        it('returns 400 when password field is missing entirely', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({}));
            expect(response.status).toBe(400);
        });

        it('does not set Set-Cookie on a 400 response', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ username: 'admin' }));
            expect(response.headers.get('Set-Cookie')).toBeNull();
        });
    });

    describe('missing env secrets', () => {
        it('returns 401 when ADMIN_PASSWORD is absent', async () => {
            mockCtx({ SESSION_SECRET: 'secret' });
            const response = await POST(makeRequest({ password: 'any' }));
            expect(response.status).toBe(401);
        });

        it('returns 401 when SESSION_SECRET is absent', async () => {
            mockCtx({ ADMIN_PASSWORD: 'correct-password' });
            const response = await POST(makeRequest({ password: 'correct-password' }));
            expect(response.status).toBe(401);
        });

        it('does not set Set-Cookie when secrets are missing', async () => {
            mockCtx({ SESSION_SECRET: 'secret' });
            const response = await POST(makeRequest({ password: 'any' }));
            expect(response.headers.get('Set-Cookie')).toBeNull();
        });
    });

    describe('wrong password', () => {
        it('returns 401 when the password does not match', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'wrong-password' }));
            expect(response.status).toBe(401);
        });

        it('does not set Set-Cookie on a failed login', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'wrong-password' }));
            expect(response.headers.get('Set-Cookie')).toBeNull();
        });

        it('response body has success:false on wrong password', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'wrong-password' }));
            const body = (await response.json()) as { success: boolean };
            expect(body.success).toBe(false);
        });
    });

    describe('correct password', () => {
        it('returns 200 on successful login', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'correct-password' }));
            expect(response.status).toBe(200);
        });

        it('response body has success:true on correct password', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'correct-password' }));
            const body = (await response.json()) as { success: boolean };
            expect(body.success).toBe(true);
        });

        it('sets Set-Cookie for x-session-data on successful login', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'correct-password' }));
            expect(response.headers.get('Set-Cookie')).toContain('x-session-data=');
        });

        it('REGRESSION GUARD: sets cookie even when COOKIE_DOMAIN is absent (host-only, Secure)', async () => {
            // No COOKIE_DOMAIN in env → cookieDomain null → cookie is Secure + host-only
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'correct-password' }));
            const setCookie = response.headers.get('Set-Cookie');
            expect(setCookie).toContain('x-session-data=');
            expect(setCookie).toContain('Secure');
            expect(setCookie).not.toContain('Domain=');
        });

        it('session cookie carries standard attributes (HttpOnly, SameSite=Lax, Path=/)', async () => {
            mockCtx(FULL_ENV);
            const response = await POST(makeRequest({ password: 'correct-password' }));
            const setCookie = response.headers.get('Set-Cookie') ?? '';
            expect(setCookie).toContain('HttpOnly');
            expect(setCookie).toContain('SameSite=Lax');
            expect(setCookie).toContain('Path=/');
        });

        it('includes Domain attribute when COOKIE_DOMAIN is set', async () => {
            mockCtx({ ...FULL_ENV, COOKIE_DOMAIN: 'app.roxom.tv' });
            const response = await POST(makeRequest({ password: 'correct-password' }));
            expect(response.headers.get('Set-Cookie')).toContain('Domain=app.roxom.tv');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('./middleware', () => ({
    withSession: vi.fn(),
}));

import { withSession } from './middleware';
import { requireAdmin, withRenewal } from './require-admin';

type WithSessionResult = { authenticated: boolean; setCookie: string | null };

function mockSession(result: WithSessionResult): void {
    vi.mocked(withSession).mockResolvedValue(result);
}

describe('requireAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('unauthenticated session', () => {
        it('returns denied:true when session is not authenticated', async () => {
            mockSession({ authenticated: false, setCookie: null });
            const result = await requireAdmin(new Request('http://localhost/'));
            expect(result.denied).toBe(true);
        });

        it('response has 401 status when denied', async () => {
            mockSession({ authenticated: false, setCookie: null });
            const result = await requireAdmin(new Request('http://localhost/'));
            if (result.denied) {
                expect(result.response.status).toBe(401);
            }
        });

        it('response body contains success:false when denied', async () => {
            mockSession({ authenticated: false, setCookie: null });
            const result = await requireAdmin(new Request('http://localhost/'));
            if (result.denied) {
                const body = (await result.response.json()) as { success: boolean };
                expect(body.success).toBe(false);
            }
        });
    });

    describe('authenticated session', () => {
        it('returns denied:false when session is authenticated', async () => {
            mockSession({ authenticated: true, setCookie: 'x-session-data=tok; Path=/' });
            const result = await requireAdmin(new Request('http://localhost/'));
            expect(result.denied).toBe(false);
        });

        it('propagates the setCookie string when authenticated', async () => {
            const setCookie = 'x-session-data=newtoken; Path=/; HttpOnly';
            mockSession({ authenticated: true, setCookie });
            const result = await requireAdmin(new Request('http://localhost/'));
            if (!result.denied) {
                expect(result.setCookie).toBe(setCookie);
            }
        });

        it('propagates null setCookie when session has no renewal cookie', async () => {
            mockSession({ authenticated: true, setCookie: null });
            const result = await requireAdmin(new Request('http://localhost/'));
            if (!result.denied) {
                expect(result.setCookie).toBeNull();
            }
        });
    });
});

describe('withRenewal', () => {
    it('attaches the Set-Cookie header when setCookie is a non-null string', () => {
        const response = NextResponse.json({ ok: true });
        const renewed = withRenewal(response, 'x-session-data=newtoken; Path=/');
        expect(renewed.headers.get('Set-Cookie')).toBe('x-session-data=newtoken; Path=/');
    });

    it('leaves the response unchanged when setCookie is null', () => {
        const response = NextResponse.json({ ok: true });
        const before = response.headers.get('Set-Cookie');
        withRenewal(response, null);
        expect(response.headers.get('Set-Cookie')).toBe(before);
    });

    it('returns the same response object instance', () => {
        const response = NextResponse.json({ ok: true });
        const returned = withRenewal(response, null);
        expect(returned).toBe(response);
    });

    it('also returns the same response object instance when a cookie is attached', () => {
        const response = NextResponse.json({ ok: true });
        const returned = withRenewal(response, 'x-session-data=tok; Path=/');
        expect(returned).toBe(response);
    });
});

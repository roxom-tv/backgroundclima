import { describe, it, expect } from 'vitest';
import type { Config } from './config';
import { setSessionCookie, clearSessionCookie, readSessionCookie } from './cookies';

const SEC_PER_DAY = 86_400;
const COOKIE_NAME = 'x-session-data';

function makeConfig(overrides: Partial<Config> = {}): Config {
    return { cookieDomain: null, sessionTtlDays: 7, ...overrides };
}

describe('cookies', () => {
    describe('setSessionCookie', () => {
        describe('security attributes by domain', () => {
            it('cookieDomain null → Secure present, no Domain attribute (host-only)', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ cookieDomain: null }));
                const cookie = headers.get('Set-Cookie') ?? '';
                expect(cookie).toContain('Secure');
                expect(cookie).not.toContain('Domain=');
            });

            it('cookieDomain localhost → no Secure, no Domain', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ cookieDomain: 'localhost' }));
                const cookie = headers.get('Set-Cookie') ?? '';
                expect(cookie).not.toContain('Secure');
                expect(cookie).not.toContain('Domain=');
            });

            it('cookieDomain 127.0.0.1 → no Secure, no Domain', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ cookieDomain: '127.0.0.1' }));
                const cookie = headers.get('Set-Cookie') ?? '';
                expect(cookie).not.toContain('Secure');
                expect(cookie).not.toContain('Domain=');
            });

            it('cookieDomain app.example.com → Domain=app.example.com + Secure', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ cookieDomain: 'app.example.com' }));
                const cookie = headers.get('Set-Cookie') ?? '';
                expect(cookie).toContain('Domain=app.example.com');
                expect(cookie).toContain('Secure');
            });
        });

        describe('invariant attributes (always present)', () => {
            it('always includes HttpOnly', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig());
                expect(headers.get('Set-Cookie')).toContain('HttpOnly');
            });

            it('always includes SameSite=Lax', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig());
                expect(headers.get('Set-Cookie')).toContain('SameSite=Lax');
            });

            it('always includes Path=/', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig());
                expect(headers.get('Set-Cookie')).toContain('Path=/');
            });

            it('cookie name and value are set correctly', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'mytoken123', makeConfig());
                expect(headers.get('Set-Cookie')).toContain(`${COOKIE_NAME}=mytoken123`);
            });
        });

        describe('Max-Age', () => {
            it('Max-Age equals sessionTtlDays * 86400 for default 7 days', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ sessionTtlDays: 7 }));
                expect(headers.get('Set-Cookie')).toContain(`Max-Age=${7 * SEC_PER_DAY}`);
            });

            it('Max-Age equals sessionTtlDays * 86400 for 14 days', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ sessionTtlDays: 14 }));
                expect(headers.get('Set-Cookie')).toContain(`Max-Age=${14 * SEC_PER_DAY}`);
            });

            it('Max-Age equals sessionTtlDays * 86400 for 30 days', () => {
                const headers = new Headers();
                setSessionCookie(headers, 'tok', makeConfig({ sessionTtlDays: 30 }));
                expect(headers.get('Set-Cookie')).toContain(`Max-Age=${30 * SEC_PER_DAY}`);
            });
        });
    });

    describe('clearSessionCookie', () => {
        it('sets Max-Age=0', () => {
            const headers = new Headers();
            clearSessionCookie(headers, makeConfig());
            expect(headers.get('Set-Cookie')).toContain('Max-Age=0');
        });

        it('includes HttpOnly, SameSite=Lax, Path=/', () => {
            const headers = new Headers();
            clearSessionCookie(headers, makeConfig());
            const cookie = headers.get('Set-Cookie') ?? '';
            expect(cookie).toContain('HttpOnly');
            expect(cookie).toContain('SameSite=Lax');
            expect(cookie).toContain('Path=/');
        });

        it('preserves Secure + Domain for non-local domain', () => {
            const headers = new Headers();
            clearSessionCookie(headers, makeConfig({ cookieDomain: 'app.example.com' }));
            const cookie = headers.get('Set-Cookie') ?? '';
            expect(cookie).toContain('Secure');
            expect(cookie).toContain('Domain=app.example.com');
        });

        it('no Secure and no Domain for localhost', () => {
            const headers = new Headers();
            clearSessionCookie(headers, makeConfig({ cookieDomain: 'localhost' }));
            const cookie = headers.get('Set-Cookie') ?? '';
            expect(cookie).not.toContain('Secure');
            expect(cookie).not.toContain('Domain=');
        });
    });

    describe('readSessionCookie', () => {
        it('returns the cookie value when x-session-data is the only cookie', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: `${COOKIE_NAME}=mytoken123` },
            });
            expect(readSessionCookie(req)).toBe('mytoken123');
        });

        it('returns null when cookie header is absent', () => {
            const req = new Request('http://localhost');
            expect(readSessionCookie(req)).toBeNull();
        });

        it('returns null when x-session-data cookie is not present among other cookies', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: 'foo=bar; baz=qux' },
            });
            expect(readSessionCookie(req)).toBeNull();
        });

        it('returns null when cookie value is empty string', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: `${COOKIE_NAME}=` },
            });
            expect(readSessionCookie(req)).toBeNull();
        });

        it('parses correctly when x-session-data appears amid other cookies', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: `foo=bar; ${COOKIE_NAME}=mytoken123; baz=qux` },
            });
            expect(readSessionCookie(req)).toBe('mytoken123');
        });

        it('handles cookie values containing = signs (e.g. base64 tokens)', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: `${COOKIE_NAME}=abc==def` },
            });
            expect(readSessionCookie(req)).toBe('abc==def');
        });

        it('trims whitespace around the cookie value', () => {
            const req = new Request('http://localhost', {
                headers: { cookie: `${COOKIE_NAME}= tok123 ` },
            });
            expect(readSessionCookie(req)).toBe('tok123');
        });
    });
});

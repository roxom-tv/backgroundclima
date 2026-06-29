import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getConfig } from './config';

type MockedCtx = { env: Record<string, string | undefined> };

function mockCtx(env: Record<string, string | undefined>): void {
    vi.mocked(getCloudflareContext).mockReturnValue({ env } as unknown as ReturnType<
        typeof getCloudflareContext
    >);
}

describe('getConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('always returns success: true', () => {
        mockCtx({});
        expect(getConfig().success).toBe(true);
    });

    describe('COOKIE_DOMAIN', () => {
        it('returns cookieDomain from env when COOKIE_DOMAIN is set', () => {
            mockCtx({ COOKIE_DOMAIN: 'app.example.com' });
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.cookieDomain).toBe('app.example.com');
            }
        });

        it('returns cookieDomain: null when COOKIE_DOMAIN is absent — regression guard', () => {
            mockCtx({});
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.cookieDomain).toBeNull();
            }
        });

        it('returns cookieDomain: null when COOKIE_DOMAIN is undefined', () => {
            mockCtx({ COOKIE_DOMAIN: undefined });
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.cookieDomain).toBeNull();
            }
        });
    });

    describe('SESSION_TTL_DAYS', () => {
        it('parses SESSION_TTL_DAYS as an integer when set', () => {
            mockCtx({ SESSION_TTL_DAYS: '14' });
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionTtlDays).toBe(14);
            }
        });

        it('uses default of 7 when SESSION_TTL_DAYS is absent', () => {
            mockCtx({});
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionTtlDays).toBe(7);
            }
        });

        it('uses default of 7 when SESSION_TTL_DAYS is undefined', () => {
            mockCtx({ SESSION_TTL_DAYS: undefined });
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionTtlDays).toBe(7);
            }
        });
    });

    describe('combined env', () => {
        it('returns all config fields together when both are set', () => {
            mockCtx({ COOKIE_DOMAIN: 'roxom.tv', SESSION_TTL_DAYS: '30' });
            const result = getConfig();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ cookieDomain: 'roxom.tv', sessionTtlDays: 30 });
            }
        });
    });
});

// Silence the unused-variable warning from the MockedCtx type being only used as a type alias
void ({} as MockedCtx);

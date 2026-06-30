import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminFetch, AdminAuthError } from './admin-fetch';

type MockWindow = { location: { href: string } };

describe('AdminAuthError', () => {
    it('is an instance of Error', () => {
        expect(new AdminAuthError()).toBeInstanceOf(Error);
    });

    it('has name set to AdminAuthError', () => {
        expect(new AdminAuthError().name).toBe('AdminAuthError');
    });

    it('has a non-empty message', () => {
        expect(new AdminAuthError().message.length).toBeGreaterThan(0);
    });
});

describe('adminFetch', () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    let mockWindow: MockWindow;

    beforeEach(() => {
        mockFetch = vi.fn();
        mockWindow = { location: { href: '' } };
        vi.stubGlobal('fetch', mockFetch);
        vi.stubGlobal('window', mockWindow);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('successful response (non-401)', () => {
        it('returns the response directly on 200', async () => {
            const mockResponse = new Response('{}', { status: 200 });
            mockFetch.mockResolvedValue(mockResponse);
            const result = await adminFetch('http://localhost/api/data');
            expect(result).toBe(mockResponse);
        });

        it('does not redirect on 200', async () => {
            mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
            await adminFetch('http://localhost/api/data');
            expect(mockWindow.location.href).not.toBe('/admin/login');
        });

        it('returns the response directly on 403 without redirect or throw', async () => {
            const mockResponse = new Response('Forbidden', { status: 403 });
            mockFetch.mockResolvedValue(mockResponse);
            const result = await adminFetch('http://localhost/api/data');
            expect(result.status).toBe(403);
            expect(mockWindow.location.href).not.toBe('/admin/login');
        });

        it('returns the response directly on 500 without redirect or throw', async () => {
            const mockResponse = new Response('Server Error', { status: 500 });
            mockFetch.mockResolvedValue(mockResponse);
            const result = await adminFetch('http://localhost/api/data');
            expect(result.status).toBe(500);
            expect(mockWindow.location.href).not.toBe('/admin/login');
        });

        it('forwards fetch init options to the underlying fetch call', async () => {
            mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
            const init: RequestInit = { method: 'POST', body: '{"x":1}' };
            await adminFetch('http://localhost/api/data', init);
            expect(mockFetch).toHaveBeenCalledWith('http://localhost/api/data', init);
        });
    });

    describe('401 response', () => {
        it('throws AdminAuthError on 401', async () => {
            mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
            await expect(adminFetch('http://localhost/api/data')).rejects.toThrow(AdminAuthError);
        });

        it('redirects window.location.href to /admin/login on 401', async () => {
            mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

            try {
                await adminFetch('http://localhost/api/data');
            } catch {
                // expected AdminAuthError
            }
            expect(mockWindow.location.href).toBe('/admin/login');
        });

        it('thrown error is an instance of Error on 401', async () => {
            mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
            await expect(adminFetch('http://localhost/api/data')).rejects.toBeInstanceOf(Error);
        });
    });
});

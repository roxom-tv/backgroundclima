/**
 * Thin fetch wrapper for admin API calls.
 * On a 401 response the session cookie has expired: redirect to login immediately
 * and throw so the caller stops processing.
 */

export class AdminAuthError extends Error {
    constructor() {
        super('Session expired. Redirecting to login...');
        this.name = 'AdminAuthError';
    }
}

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status === 401) {
        window.location.href = '/admin/login';
        throw new AdminAuthError();
    }

    return response;
}

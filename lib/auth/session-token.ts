/**
 * Stateless signed-cookie token for the admin session gate.
 *
 * Token format: `<expiryMs>.<base64url HMAC-SHA256(secret, expiryMs)>`
 *
 * signToken   — produce a new signed token expiring at `expiryMs`
 * verifyToken — parse, recompute HMAC, constant-time compare, check expiry
 *
 * Uses Web Crypto (crypto.subtle) only — safe in Cloudflare Workers edge runtime.
 */

function base64urlEncode(bytes: Uint8Array): string {
    let binary = '';

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(input: string): Uint8Array | null {
    try {
        const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    } catch {
        return null;
    }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
    const keyBytes = new TextEncoder().encode(secret);

    return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);
}

async function computeHmac(key: CryptoKey, message: string): Promise<Uint8Array> {
    const data = new TextEncoder().encode(message);
    const sig = await crypto.subtle.sign('HMAC', key, data);

    return new Uint8Array(sig);
}

/**
 * Signs a token encoding the given expiry timestamp in milliseconds.
 * Returns the opaque token string suitable for storing as a cookie value.
 */
export async function signToken(expiryMs: number, secret: string): Promise<string> {
    const payload = String(expiryMs);
    const key = await importHmacKey(secret);
    const sig = await computeHmac(key, payload);

    return `${payload}.${base64urlEncode(sig)}`;
}

/**
 * Verifies a signed token. Returns true only when all of the following hold:
 * - token is well-formed (`<non-negative integer>.<base64url>`)
 * - HMAC recomputed from the payload matches the provided signature (constant-time)
 * - expiry has not passed relative to `now` (milliseconds)
 *
 * Fails closed — any parse error or crypto error returns false without throwing.
 */
export async function verifyToken(value: string, secret: string, now: number): Promise<boolean> {
    try {
        const dotIndex = value.indexOf('.');

        if (dotIndex === -1) {
            return false;
        }

        const payload = value.slice(0, dotIndex);
        const sigB64 = value.slice(dotIndex + 1);

        if (!/^\d+$/.test(payload)) {
            return false;
        }

        const expiryMs = Number(payload);

        if (!Number.isFinite(expiryMs) || expiryMs <= now) {
            return false;
        }

        const providedSigBytes = base64urlDecode(sigB64);

        if (!providedSigBytes) {
            return false;
        }

        const key = await importHmacKey(secret);
        const expectedSigBytes = await computeHmac(key, payload);

        if (providedSigBytes.length !== expectedSigBytes.length) {
            return false;
        }

        let diff = 0;

        for (let i = 0; i < expectedSigBytes.length; i++) {
            diff |= expectedSigBytes[i] ^ providedSigBytes[i];
        }

        return diff === 0;
    } catch {
        return false;
    }
}

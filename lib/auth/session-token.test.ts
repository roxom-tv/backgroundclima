import { describe, it, expect, beforeAll } from 'vitest';
import { signToken, verifyToken } from './session-token';

const SECRET = 'test-secret-abc123';
const ALT_SECRET = 'different-secret-xyz';

// Stable reference time used throughout — all expiry comparisons are relative to this.
const NOW = Date.now();
const FUTURE = NOW + 60_000;
const PAST = NOW - 1;

describe('signToken', () => {
    it('returns a string with exactly one dot separator', async () => {
        const token = await signToken(FUTURE, SECRET);
        const parts = token.split('.');
        expect(parts).toHaveLength(2);
    });

    it('encodes the expiry milliseconds as the payload segment', async () => {
        const token = await signToken(FUTURE, SECRET);
        const payload = token.split('.')[0];
        expect(payload).toBe(String(FUTURE));
    });

    it('produces a non-empty base64url signature segment', async () => {
        const token = await signToken(FUTURE, SECRET);
        const sig = token.split('.')[1];
        expect(sig.length).toBeGreaterThan(0);
        // base64url alphabet only — no +, /, or =
        expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('produces the same token for the same inputs (deterministic HMAC)', async () => {
        const a = await signToken(FUTURE, SECRET);
        const b = await signToken(FUTURE, SECRET);
        expect(a).toBe(b);
    });

    it('produces different tokens for different secrets', async () => {
        const a = await signToken(FUTURE, SECRET);
        const b = await signToken(FUTURE, ALT_SECRET);
        expect(a).not.toBe(b);
    });
});

describe('verifyToken', () => {
    describe('round-trip', () => {
        it('returns true when the token is valid and expiry is in the future', async () => {
            const token = await signToken(FUTURE, SECRET);
            const result = await verifyToken(token, SECRET, NOW);
            expect(result).toBe(true);
        });

        it('returns true for an expiry 1 ms ahead of now', async () => {
            const token = await signToken(NOW + 1, SECRET);
            const result = await verifyToken(token, SECRET, NOW);
            expect(result).toBe(true);
        });
    });

    describe('expired token', () => {
        it('returns false when expiry equals now', async () => {
            const token = await signToken(NOW, SECRET);
            const result = await verifyToken(token, SECRET, NOW);
            expect(result).toBe(false);
        });

        it('returns false when expiry is in the past', async () => {
            const token = await signToken(PAST, SECRET);
            const result = await verifyToken(token, SECRET, NOW);
            expect(result).toBe(false);
        });

        it('returns false for a token that was valid but has since expired (simulated passage of time)', async () => {
            const token = await signToken(FUTURE, SECRET);
            // Pretend "now" has advanced past the expiry
            const futureNow = FUTURE + 1;
            const result = await verifyToken(token, SECRET, futureNow);
            expect(result).toBe(false);
        });
    });

    describe('wrong secret', () => {
        it('returns false when verified with a different secret', async () => {
            const token = await signToken(FUTURE, SECRET);
            const result = await verifyToken(token, ALT_SECRET, NOW);
            expect(result).toBe(false);
        });

        it('returns false when verified with an empty string secret', async () => {
            const token = await signToken(FUTURE, SECRET);
            const result = await verifyToken(token, '', NOW);
            expect(result).toBe(false);
        });
    });

    describe('tampered payload', () => {
        it('returns false when the expiry prefix is modified but the signature is unchanged', async () => {
            const token = await signToken(FUTURE, SECRET);
            const [, sig] = token.split('.');
            // Bump the expiry by 1 ms — the HMAC was not computed over the new value.
            const tamperedPayload = String(FUTURE + 1);
            const tampered = `${tamperedPayload}.${sig}`;
            const result = await verifyToken(tampered, SECRET, NOW);
            expect(result).toBe(false);
        });

        it('returns false when the expiry prefix is replaced with a completely different value', async () => {
            const token = await signToken(FUTURE, SECRET);
            const [, sig] = token.split('.');
            const tampered = `${FUTURE + 999999}.${sig}`;
            const result = await verifyToken(tampered, SECRET, NOW);
            expect(result).toBe(false);
        });
    });

    describe('tampered signature', () => {
        it('returns false when a character in the signature is flipped', async () => {
            const token = await signToken(FUTURE, SECRET);
            const [payload, sig] = token.split('.');

            // Flip the first character of the signature segment.
            const flipped = sig[0] === 'A' ? 'B' + sig.slice(1) : 'A' + sig.slice(1);
            const tampered = `${payload}.${flipped}`;

            const result = await verifyToken(tampered, SECRET, NOW);
            expect(result).toBe(false);
        });

        it('returns false when the signature is truncated', async () => {
            const token = await signToken(FUTURE, SECRET);
            const [payload, sig] = token.split('.');
            const tampered = `${payload}.${sig.slice(0, -4)}`;
            const result = await verifyToken(tampered, SECRET, NOW);
            expect(result).toBe(false);
        });
    });

    describe('malformed input — returns false without throwing', () => {
        const cases: Array<[string, string]> = [
            ['empty string', ''],
            ['no dot separator', `${FUTURE}abc`],
            ['only a dot', '.'],
            ['non-numeric expiry', `abc.${Buffer.from('fakesig').toString('base64url')}`],
            ['negative expiry', `-1.${Buffer.from('fakesig').toString('base64url')}`],
            ['float expiry', `1.5.${Buffer.from('fakesig').toString('base64url')}`],
            ['extra segments (two dots)', `${FUTURE}.abc.def`],
            ['payload only, empty sig', `${FUTURE}.`],
            ['whitespace expiry', `   .abc`],
        ];

        for (const [label, input] of cases) {
            it(`returns false for: ${label}`, async () => {
                await expect(verifyToken(input, SECRET, NOW)).resolves.toBe(false);
            });
        }
    });
});

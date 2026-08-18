import { describe, it, expect } from 'vitest';

import {
    ALLOWED_MIME_TYPES,
    hasMatchingSignature,
    buildObjectKey,
    validateUpload,
} from './media-upload';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38];
const SVG_TEXT = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

function fileOf(bytes: number[] | string, type: string, name = 'x') {
    const body = typeof bytes === 'string' ? bytes : new Uint8Array(bytes);

    return new File([body], name, { type });
}

function webpBytes() {
    const b = new Uint8Array(16);
    b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP

    return Array.from(b);
}

describe('ALLOWED_MIME_TYPES', () => {
    it('does not include SVG', () => {
        expect(ALLOWED_MIME_TYPES).not.toContain('image/svg+xml');
    });
});

describe('hasMatchingSignature', () => {
    it('accepts real bytes for each allowed type', () => {
        expect(hasMatchingSignature('image/png', new Uint8Array(PNG))).toBe(true);
        expect(hasMatchingSignature('image/jpeg', new Uint8Array(JPEG))).toBe(true);
        expect(hasMatchingSignature('image/gif', new Uint8Array(GIF))).toBe(true);
        expect(hasMatchingSignature('image/webp', new Uint8Array(webpBytes()))).toBe(true);
    });

    it('rejects bytes that do not match the claimed type', () => {
        expect(hasMatchingSignature('image/png', new Uint8Array(JPEG))).toBe(false);
    });

    // Default-deny fallthrough: a type with no signature rule can never pass,
    // so re-adding one to the MIME allowlist alone does not reopen the hole.
    it('rejects any type it has no rule for', () => {
        expect(hasMatchingSignature('image/svg+xml', new Uint8Array(PNG))).toBe(false);
        expect(hasMatchingSignature('text/html', new Uint8Array(PNG))).toBe(false);
        expect(hasMatchingSignature('', new Uint8Array(PNG))).toBe(false);
    });
});

describe('validateUpload', () => {
    it('accepts a genuine PNG', async () => {
        const result = await validateUpload(fileOf(PNG, 'image/png', 'a.png'));

        expect(result.ok).toBe(true);
        expect(result.ok && result.extension).toBe('png');
        expect(result.ok && result.contentType).toBe('image/png');
    });

    it('rejects an SVG declaring itself as such', async () => {
        const result = await validateUpload(fileOf(SVG_TEXT, 'image/svg+xml', 'a.svg'));

        expect(result.ok).toBe(false);
    });

    // The attack the audit found: client-supplied MIME was the only gate, so
    // renaming an SVG to .png and claiming image/png got it stored and served.
    it('rejects an SVG masquerading as a PNG', async () => {
        const result = await validateUpload(fileOf(SVG_TEXT, 'image/png', 'a.png'));

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.error).toMatch(/does not match/i);
    });

    it('rejects a file over the size limit before reading its bytes', async () => {
        const big = new Uint8Array(6 * 1024 * 1024);

        big.set(PNG, 0);

        const result = await validateUpload(new File([big], 'big.png', { type: 'image/png' }));

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.error).toMatch(/5MB/);
    });
});

describe('buildObjectKey', () => {
    it('is unguessable and carries no caller-supplied path component', () => {
        const a = buildObjectKey('sponsors', 'png');
        const b = buildObjectKey('sponsors', 'png');

        expect(a).not.toBe(b);
        expect(a).toMatch(/^sponsors\/[0-9a-f-]{36}\.png$/);
    });
});

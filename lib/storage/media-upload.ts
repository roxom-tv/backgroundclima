/**
 * Shared validation for admin image uploads (sponsors, events).
 *
 * Ported from RTV-TL-MANAGER's `lib/helpers/media-upload.ts`, which is the
 * reference implementation in this workspace.
 *
 * The design point worth preserving is that the signature check is an allowlist
 * with a default-deny fallthrough: `valid` starts false and only a recognised
 * (mime, signature) PAIR sets it true. Any MIME with no signature rule fails
 * closed automatically, so adding a type to ALLOWED_MIME_TYPES without also
 * adding its magic bytes does not silently reopen the hole.
 */

/** SVG is deliberately absent: it is an executable document, not just an image.
 *  A stored SVG served inline from our own origin runs its own <script>. */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

function isAllowedMimeType(value: string): value is AllowedMimeType {
    return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
    return signature.every((value, index) => bytes[index] === value);
}

function hasAsciiSignature(bytes: Uint8Array, signature: string, offset = 0): boolean {
    return signature.split('').every((char, i) => bytes[offset + i] === char.charCodeAt(0));
}

function hasWebpSignature(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 12 &&
        hasAsciiSignature(bytes, 'RIFF', 0) &&
        hasAsciiSignature(bytes, 'WEBP', 8)
    );
}

/**
 * True when the file's leading bytes match the format it claims to be.
 *
 * `file.type` is the client-supplied multipart Content-Type and is trivially
 * spoofable, so it cannot be the only gate: a .png-labelled SVG would otherwise
 * be stored and later served as an executable document.
 */
export function hasMatchingSignature(mimeType: string, bytes: Uint8Array): boolean {
    return (
        (mimeType === 'image/png' &&
            startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
        (mimeType === 'image/jpeg' && startsWith(bytes, [0xff, 0xd8, 0xff])) ||
        (mimeType === 'image/gif' && hasAsciiSignature(bytes, 'GIF8')) ||
        (mimeType === 'image/webp' && hasWebpSignature(bytes))
    );
}

export type ValidatedUpload =
    | { ok: true; bytes: ArrayBuffer; extension: string; contentType: AllowedMimeType }
    | { ok: false; error: string };

/**
 * Validates an uploaded file: size, declared type, and that its bytes actually
 * match that type. Checks run cheapest-first, and only the first 16 bytes are
 * inspected for the signature.
 */
export async function validateUpload(file: File): Promise<ValidatedUpload> {
    if (file.size > MAX_FILE_SIZE) {
        return { ok: false, error: 'File exceeds 5MB limit' };
    }

    if (!isAllowedMimeType(file.type)) {
        return { ok: false, error: 'Invalid file type. Use JPEG, PNG, GIF or WebP' };
    }

    const bytes = await file.arrayBuffer();

    if (!hasMatchingSignature(file.type, new Uint8Array(bytes.slice(0, 16)))) {
        return { ok: false, error: 'File content does not match its declared type' };
    }

    return { ok: true, bytes, extension: MIME_TO_EXT[file.type], contentType: file.type };
}

/** Unguessable, collision-free object key. No user-controlled path component. */
export function buildObjectKey(prefix: string, extension: string): string {
    return `${prefix}/${crypto.randomUUID()}.${extension}`;
}

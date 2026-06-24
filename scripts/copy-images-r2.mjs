#!/usr/bin/env node
/**
 * copy-images-r2.mjs
 * -------------------
 * One-shot migration: Supabase Storage bucket "sponsors" → Cloudflare R2 bucket
 * "backgroundclima-media", preserving the key scheme expected by
 * app/api/media/[...path]/route.ts and app/api/admin/upload/route.ts.
 *
 * ── KEY MAPPING ──────────────────────────────────────────────────────────────
 *
 *   Supabase bucket: sponsors
 *   ┌─────────────────────────────────┬─────────────────────────────────────┐
 *   │ Supabase object path            │ R2 key (→ served at /api/media/<key>)│
 *   ├─────────────────────────────────┼─────────────────────────────────────┤
 *   │ events/banner.png               │ events/banner.png                   │
 *   │ events/<uuid>.webp              │ events/<uuid>.webp                  │
 *   │ logo.png   (root — logo)        │ sponsors/logo.png                   │
 *   │ <uuid>.jpg (root — logo)        │ sponsors/<uuid>.jpg                 │
 *   └─────────────────────────────────┴─────────────────────────────────────┘
 *
 *   Root objects are promoted into the "sponsors/" prefix because the new
 *   upload route (app/api/admin/upload/route.ts) stores sponsor logos as
 *   `sponsors/<uuid>.<ext>`, making the served URL `/api/media/sponsors/<file>`.
 *   Objects already under "events/" are copied verbatim — that prefix is the
 *   same in both the old Supabase layout and the new R2 layout.
 *
 * ── URL REWRITE DIVISION (T14 vs THIS SCRIPT) ────────────────────────────────
 *
 *   This script only copies binary objects. It does NOT rewrite D1 rows.
 *
 *   T14 (scripts/backfill-d1.mjs, not yet authored) owns the row rewrite:
 *     sponsors.logo_url : <supabase-storage-url>  →  /api/media/sponsors/<file>
 *     events.image_url  : <supabase-storage-url>  →  /api/media/events/<file>
 *
 *   Run this script BEFORE T14 so the R2 objects exist when the app starts
 *   reading the rewritten URLs from D1.
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   1. R2 bucket created:
 *        wrangler r2 bucket create backgroundclima-media
 *        wrangler r2 bucket create backgroundclima-media-dev   # if needed
 *
 *   2. Environment variables (set in your shell or a local .env file):
 *        SUPABASE_URL              e.g. https://<ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY  (service-role JWT, not anon key)
 *
 *   3. wrangler authenticated:
 *        wrangler login            # or CLOUDFLARE_API_TOKEN env var
 *
 *   4. Node.js ≥ 18 (uses native fetch + ReadableStream), wrangler in PATH:
 *        npm ls -g wrangler        # or npx wrangler --version
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   # Dry-run — print what would be copied, no writes:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/copy-images-r2.mjs --dry-run
 *
 *   # Live run against prod R2 bucket:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/copy-images-r2.mjs
 *
 *   # Target a different R2 bucket (e.g. dev):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/copy-images-r2.mjs \
 *     --bucket backgroundclima-media-dev
 *
 * ── COPY MECHANISM ────────────────────────────────────────────────────────────
 *
 *   Objects are uploaded via `wrangler r2 object put <bucket>/<key>` fed from
 *   stdin (--file=-). This avoids wiring up separate R2 S3-compat access keys
 *   and reuses the wrangler session already required for deployment.
 *
 *   Required creds summary:
 *     • Supabase: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *     • Cloudflare/R2: wrangler login session OR CLOUDFLARE_API_TOKEN env var
 *       (no separate R2 access key ID / secret access key needed)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOURCE_BUCKET = 'sponsors';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const bucketFlagIdx = args.indexOf('--bucket');
const R2_BUCKET =
    bucketFlagIdx !== -1 && args[bucketFlagIdx + 1]
        ? args[bucketFlagIdx + 1]
        : 'backgroundclima-media';

// ── Validation ────────────────────────────────────────────────────────────────

if (!SUPABASE_URL) {
    die('SUPABASE_URL is not set.');
}

if (!SERVICE_ROLE_KEY) {
    die('SUPABASE_SERVICE_ROLE_KEY is not set.');
}

log(`Source : Supabase Storage bucket "${SOURCE_BUCKET}" at ${SUPABASE_URL}`);
log(`Target : R2 bucket "${R2_BUCKET}"`);

if (DRY_RUN) {
    log('Mode   : DRY RUN — no objects will be written to R2');
} else {
    log('Mode   : LIVE — objects will be written to R2');
}

// ── Supabase Storage helpers ──────────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
    const url = `${SUPABASE_URL}/storage/v1${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
            ...(options.headers ?? {}),
        },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Supabase ${res.status} for ${url}: ${body}`);
    }

    return res;
}

/**
 * List all objects in a Supabase Storage bucket using the /object/list endpoint.
 * Returns a flat array of { name, metadata } items.
 *
 * Supabase list is paginated (default 100/page). We recurse into subdirectories
 * by listing with a prefix filter.
 */
async function listObjects(bucket, prefix = '') {
    const body = JSON.stringify({
        prefix,
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    const res = await supabaseFetch(`/object/list/${bucket}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });

    const items = await res.json();

    if (!Array.isArray(items)) {
        throw new Error(`Unexpected list response: ${JSON.stringify(items)}`);
    }

    const objects = [];

    for (const item of items) {
        if (item.id === null) {
            // Supabase returns a "folder" placeholder with id=null when there are
            // sub-paths. Recurse into it.
            const subPrefix = prefix ? `${prefix}/${item.name}` : item.name;
            const children = await listObjects(bucket, subPrefix);
            objects.push(...children);
        } else {
            // Real object — name is relative to the prefix query.
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            objects.push({ path: fullPath, metadata: item.metadata });
        }
    }

    return objects;
}

/** Download a single object; returns a Buffer. */
async function downloadObject(bucket, objectPath) {
    const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
    const res = await supabaseFetch(`/object/${bucket}/${encoded}`);
    const buf = Buffer.from(await res.arrayBuffer());

    return { buf, contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
}

// ── Key mapping ───────────────────────────────────────────────────────────────

/**
 * Derive the R2 key for a given Supabase object path.
 *
 *   events/x.png  →  events/x.png   (events prefix preserved verbatim)
 *   logo.png      →  sponsors/logo.png  (root objects promoted to sponsors/)
 */
function toR2Key(supabasePath) {
    if (supabasePath.startsWith('events/')) {
        return supabasePath;
    }

    return `sponsors/${supabasePath}`;
}

// ── R2 upload via wrangler ────────────────────────────────────────────────────

const TMP_DIR = mkdtempSync(join(tmpdir(), 'copy-images-r2-'));

function uploadToR2(r2Key, buf, contentType) {
    const tmpFile = join(TMP_DIR, r2Key.replace(/\//g, '__'));
    writeFileSync(tmpFile, buf);

    try {
        execFileSync(
            'wrangler',
            [
                'r2',
                'object',
                'put',
                `${R2_BUCKET}/${r2Key}`,
                '--file',
                tmpFile,
                '--content-type',
                contentType,
                // local-dev seeding: write to miniflare R2 state instead of remote
                ...(process.env.R2_LOCAL === '1' ? ['--local'] : ['--remote']),
            ],
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
    } finally {
        try {
            unlinkSync(tmpFile);
        } catch {
            // ignore cleanup errors
        }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    log('\nListing objects in Supabase Storage…');
    const objects = await listObjects(SOURCE_BUCKET);

    if (objects.length === 0) {
        log('No objects found in the source bucket. Exiting.');

        return;
    }

    log(`Found ${objects.length} object(s):\n`);

    for (const obj of objects) {
        const r2Key = toR2Key(obj.path);
        log(`  ${obj.path}  →  ${R2_BUCKET}/${r2Key}`);
    }

    if (DRY_RUN) {
        log('\nDry run complete. Re-run without --dry-run to copy.');

        return;
    }

    log('\nStarting copy…');

    let copied = 0;
    let failed = 0;

    for (const obj of objects) {
        const r2Key = toR2Key(obj.path);

        try {
            log(`[${copied + failed + 1}/${objects.length}] Downloading ${obj.path}…`);
            const { buf, contentType } = await downloadObject(SOURCE_BUCKET, obj.path);

            log(
                `[${copied + failed + 1}/${objects.length}] Uploading → ${R2_BUCKET}/${r2Key} (${buf.length} bytes, ${contentType})`,
            );
            uploadToR2(r2Key, buf, contentType);

            log(`[${copied + failed + 1}/${objects.length}] OK`);
            copied++;
        } catch (err) {
            log(`[${copied + failed + 1}/${objects.length}] FAILED: ${err.message}`);
            failed++;
        }
    }

    log(`\nDone. Copied: ${copied}  Failed: ${failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function log(msg) {
    process.stdout.write(`${msg}\n`);
}

function die(msg) {
    process.stderr.write(`ERROR: ${msg}\n`);
    process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────

main().catch((err) => {
    die(err.message);
});

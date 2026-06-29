#!/usr/bin/env node
/**
 * backfill-d1.mjs — Supabase → Cloudflare D1 one-shot data backfill
 *
 * ============================================================
 * PREREQUISITES — do not run until ALL are true
 * ============================================================
 *  1. D1 migration applied:
 *       wrangler d1 migrations apply backgroundclima --remote
 *     Verify with:
 *       wrangler d1 execute backgroundclima --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
 *
 *  2. wrangler.jsonc database_id points to the correct PRODUCTION D1 database.
 *
 *  3. A maintenance / freeze window is in effect so the Supabase source is
 *     not mutated while this script runs.
 *
 *  4. scripts/copy-images-r2.mjs has already been run so all R2 objects exist
 *     before the app starts reading the rewritten URLs written by this script.
 *
 * ============================================================
 * REQUIRED ENV VARS
 * ============================================================
 *   SUPABASE_URL              — e.g. https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service-role JWT (never the anon key)
 *
 * ============================================================
 * RUN COMMANDS
 * ============================================================
 *
 *  Step 1 — generate the SQL file (this script):
 *
 *    # dry-run (prints row counts + first sample per table, no file written)
 *    SUPABASE_URL=https://xxx.supabase.co \
 *    SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *    node scripts/backfill-d1.mjs --dry-run
 *
 *    # write the SQL file
 *    SUPABASE_URL=https://xxx.supabase.co \
 *    SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *    node scripts/backfill-d1.mjs
 *    # → writes scripts/backfill-d1-output.sql
 *
 *  Step 2 — load into D1:
 *
 *    # remote (prod D1 database — use during freeze window)
 *    wrangler d1 execute backgroundclima --remote --file=scripts/backfill-d1-output.sql
 *
 *    # local (dev / smoke-test first — recommended before hitting prod)
 *    wrangler d1 execute backgroundclima --local --file=scripts/backfill-d1-output.sql
 *
 * ============================================================
 * IDEMPOTENCY
 * ============================================================
 *  All INSERTs use INSERT OR REPLACE, so re-running the SQL file is safe.
 *  Existing rows with the same primary key are fully replaced.
 *
 * ============================================================
 * INSERT ORDER (FK-safe)
 * ============================================================
 *  1. sponsors   (no FKs)
 *  2. events     (no FKs)
 *  3. settings   (no FKs)
 *  4. slides     (FK → sponsors.id × 5 columns)
 *
 * ============================================================
 * URL REWRITE (T14/T15 resolution)
 * ============================================================
 *  copy-images-r2.mjs owns binary copies only. This script owns the DB-side
 *  URL rewrite. Absolute Supabase Storage URLs are converted to app-relative
 *  /api/media/<key> paths so D1 rows are independent of Supabase after cutover.
 *
 *  Key mapping (mirrors copy-images-r2.mjs exactly):
 *    Supabase bucket: sponsors
 *    sponsors/<ref>.supabase.co/.../public/sponsors/events/<file>
 *      → /api/media/events/<file>        (events/ prefix preserved verbatim)
 *    sponsors/<ref>.supabase.co/.../public/sponsors/<file>   (root object)
 *      → /api/media/sponsors/<file>      (promoted under sponsors/ prefix)
 *
 *  Columns rewritten:
 *    sponsors.logo_url
 *    events.image_url
 *    slides.image_url
 *
 *  Values that are NULL, already app-relative (/api/media/…), or not a
 *  recognisable Supabase Storage URL are passed through unchanged (idempotent).
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run');
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, 'backfill-d1-output.sql');

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        'ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.',
    );
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase client (service-role, bypasses RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// SQL value escaping helpers
// ---------------------------------------------------------------------------

/**
 * Escape a string value for embedding in a SQL literal.
 * Doubles single-quotes; wraps in single-quotes.
 * Returns 'NULL' for null / undefined.
 */
function sqlStr(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    // Escape single-quotes by doubling them
    const escaped = String(value).replace(/'/g, "''");

    return `'${escaped}'`;
}

/** Integer literal or NULL. */
function sqlInt(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    const n = Number(value);

    if (!Number.isInteger(n)) {
        throw new Error(`Expected integer, got: ${JSON.stringify(value)}`);
    }

    return String(n);
}

/** Boolean → SQLite integer (1 / 0) or NULL. */
function sqlBool(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    return value ? '1' : '0';
}

/**
 * JSON/array column → JSON.stringify'd text literal, or NULL.
 * Supabase may return the value as a JS object (parsed JSONB) or as a string.
 */
function sqlJson(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);

    return sqlStr(stringified);
}

/**
 * Text column that is already a string (UUIDs, dates, times, plain text).
 * Supabase timestamptz columns come back as ISO-8601 strings — stored as-is.
 */
function sqlText(value) {
    return sqlStr(value);
}

// ---------------------------------------------------------------------------
// Storage URL rewriter
// ---------------------------------------------------------------------------

/**
 * Convert an absolute Supabase Storage URL to an app-relative /api/media/<key>
 * path that is served by app/api/media/[...path]/route.ts.
 *
 * Supabase public URL form:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *
 * The Supabase bucket for this project is "sponsors". Objects inside it follow
 * the key scheme established by copy-images-r2.mjs:
 *   events/<file>  — event banner images (stored under events/ sub-prefix)
 *   <file>         — root objects (sponsor logos, no sub-prefix)
 *
 * Resulting R2 key / served URL:
 *   events/<file>  →  /api/media/events/<file>
 *   <file>         →  /api/media/sponsors/<file>
 *
 * Values that are null/undefined, already app-relative, or not a recognisable
 * Supabase Storage URL are returned unchanged (idempotent, safe to re-run).
 *
 * @param {string | null | undefined} value  Raw column value from Supabase
 * @returns {string | null | undefined}       Rewritten value (or original)
 */
function rewriteStorageUrl(value) {
    if (value === null || value === undefined || value === '') {
        return value;
    }

    // Already app-relative — idempotent pass-through
    if (value.startsWith('/api/media/')) {
        return value;
    }

    // Must look like a Supabase Storage public URL
    // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const STORAGE_RE = /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;

    const match = value.match(STORAGE_RE);

    if (!match) {
        // Not a Supabase Storage URL — leave untouched (could be an external URL
        // or a value that doesn't need rewriting)
        return value;
    }

    // match[1] is everything after the bucket name, e.g. "events/banner.png"
    // or "logo.png" for root objects
    const objectPath = match[1];

    const r2Key = objectPath.startsWith('events/') ? objectPath : `sponsors/${objectPath}`;

    return `/api/media/${r2Key}`;
}

// ---------------------------------------------------------------------------
// Row fetchers — paginate to avoid 1000-row default limit
// ---------------------------------------------------------------------------

/**
 * Fetch every row from a Supabase table using cursor pagination on `id`.
 * Returns the full array.
 */
async function fetchAll(table) {
    const PAGE = 1000;
    const rows = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + PAGE - 1)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch ${table}: ${error.message}`);
        }

        if (!data || data.length === 0) {
            break;
        }

        rows.push(...data);

        if (data.length < PAGE) {
            break;
        }
        from += PAGE;
    }

    return rows;
}

// ---------------------------------------------------------------------------
// SQL generator functions — one per table
// ---------------------------------------------------------------------------

function generateSponsorsSQL(rows) {
    if (rows.length === 0) {
        return '-- sponsors: no rows\n';
    }

    const lines = rows.map((r) => {
        return (
            `INSERT OR REPLACE INTO sponsors ` +
            `(id, name, logo_url, website_url, is_active, order_index, created_at, updated_at) VALUES (` +
            [
                sqlText(r.id),
                sqlText(r.name),
                sqlText(rewriteStorageUrl(r.logo_url)),
                sqlText(r.website_url),
                sqlBool(r.is_active),
                sqlInt(r.order_index),
                sqlText(r.created_at),
                sqlText(r.updated_at),
            ].join(', ') +
            `);`
        );
    });

    return lines.join('\n') + '\n';
}

function generateEventsSQL(rows) {
    if (rows.length === 0) {
        return '-- events: no rows\n';
    }

    const lines = rows.map((r) => {
        return (
            `INSERT OR REPLACE INTO events ` +
            `(id, title, description, image_url, start_date, end_date, start_time, end_time, ` +
            `is_active, order_index, color, title_font, title_size, title_color, text_color, ` +
            `overlay_opacity, show_date_badge, location, schedule_times, created_at, updated_at) VALUES (` +
            [
                sqlText(r.id),
                sqlText(r.title),
                sqlText(r.description),
                sqlText(rewriteStorageUrl(r.image_url)),
                sqlText(r.start_date),
                sqlText(r.end_date),
                sqlText(r.start_time),
                sqlText(r.end_time),
                sqlBool(r.is_active),
                sqlInt(r.order_index),
                sqlText(r.color),
                sqlText(r.title_font),
                sqlText(r.title_size),
                sqlText(r.title_color),
                sqlText(r.text_color),
                sqlInt(r.overlay_opacity),
                sqlBool(r.show_date_badge),
                sqlText(r.location),
                // schedule_times: Supabase JSONB → comes back as JS object; stringify for D1 text
                sqlJson(r.schedule_times),
                sqlText(r.created_at),
                sqlText(r.updated_at),
            ].join(', ') +
            `);`
        );
    });

    return lines.join('\n') + '\n';
}

function generateSettingsSQL(rows) {
    if (rows.length === 0) {
        return '-- settings: no rows\n';
    }

    const lines = rows.map((r) => {
        return (
            `INSERT OR REPLACE INTO settings ` +
            `(id, key, value, updated_at) VALUES (` +
            [
                sqlText(r.id),
                sqlText(r.key),
                // value is JSONB in Supabase (GlobalSettings object) → stringify for D1 text
                sqlJson(r.value),
                sqlText(r.updated_at),
            ].join(', ') +
            `);`
        );
    });

    return lines.join('\n') + '\n';
}

function generateSlidesSQL(rows) {
    if (rows.length === 0) {
        return '-- slides: no rows\n';
    }

    const lines = rows.map((r) => {
        return (
            `INSERT OR REPLACE INTO slides ` +
            `(id, type, name, country, youtube_url, weather_query, timezone, ` +
            `duration_seconds, order_index, is_active, show_weather, show_sponsor, ` +
            `description, image_url, start_date, end_date, start_time, end_time, color, ` +
            `sponsor_id, sponsor_top_left, sponsor_top_right, sponsor_bottom_left, sponsor_bottom_right, ` +
            `host_name, show_days, schedule_times, selected_event_ids, ` +
            `layout_orientation, event_slide_style, event_slide_title, ` +
            `headline, source, video_url, loop_count, ` +
            `active_days, active_time_start, active_time_end, ` +
            `created_at, updated_at) VALUES (` +
            [
                sqlText(r.id),
                sqlText(r.type),
                sqlText(r.name),
                sqlText(r.country),
                sqlText(r.youtube_url),
                sqlText(r.weather_query),
                sqlText(r.timezone),
                sqlInt(r.duration_seconds),
                sqlInt(r.order_index),
                sqlBool(r.is_active),
                sqlBool(r.show_weather),
                sqlBool(r.show_sponsor),
                sqlText(r.description),
                sqlText(rewriteStorageUrl(r.image_url)),
                sqlText(r.start_date),
                sqlText(r.end_date),
                sqlText(r.start_time),
                sqlText(r.end_time),
                sqlText(r.color),
                sqlText(r.sponsor_id),
                sqlText(r.sponsor_top_left),
                sqlText(r.sponsor_top_right),
                sqlText(r.sponsor_bottom_left),
                sqlText(r.sponsor_bottom_right),
                sqlText(r.host_name),
                sqlText(r.show_days),
                // schedule_times: ScheduleTime[] in Supabase (JSONB) → stringify
                sqlJson(r.schedule_times),
                // selected_event_ids: string[] in Supabase (JSONB) → stringify
                sqlJson(r.selected_event_ids),
                sqlText(r.layout_orientation),
                sqlText(r.event_slide_style),
                sqlText(r.event_slide_title),
                sqlText(r.headline),
                sqlText(r.source),
                sqlText(r.video_url),
                r.loop_count !== null && r.loop_count !== undefined ? sqlInt(r.loop_count) : 'NULL',
                // active_days: number[] in Supabase (JSONB) → stringify
                sqlJson(r.active_days),
                sqlText(r.active_time_start),
                sqlText(r.active_time_end),
                sqlText(r.created_at),
                sqlText(r.updated_at),
            ].join(', ') +
            `);`
        );
    });

    return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`[backfill-d1] ${DRY_RUN ? 'DRY RUN — ' : ''}Fetching rows from Supabase...`);

    const [sponsors, events, settings, slides] = await Promise.all([
        fetchAll('sponsors'),
        fetchAll('events'),
        fetchAll('settings'),
        fetchAll('slides'),
    ]);

    console.log(`[backfill-d1] Row counts:`);
    console.log(`  sponsors : ${sponsors.length}`);
    console.log(`  events   : ${events.length}`);
    console.log(`  settings : ${settings.length}`);
    console.log(`  slides   : ${slides.length}`);

    if (DRY_RUN) {
        console.log('\n[backfill-d1] Samples (first row per table):');

        if (sponsors.length > 0) {
            console.log('\n--- sponsors[0] ---');
            console.log(JSON.stringify(sponsors[0], null, 2));
        }
        if (events.length > 0) {
            console.log('\n--- events[0] ---');
            console.log(JSON.stringify(events[0], null, 2));
        }
        if (settings.length > 0) {
            console.log('\n--- settings[0] ---');
            console.log(JSON.stringify(settings[0], null, 2));
        }
        if (slides.length > 0) {
            console.log('\n--- slides[0] ---');
            console.log(JSON.stringify(slides[0], null, 2));
        }

        console.log('\n[backfill-d1] DRY RUN complete — no SQL file written.');

        return;
    }

    // Build SQL output
    const header = [
        '-- ==========================================================',
        `-- backfill-d1-output.sql`,
        `-- Generated: ${new Date().toISOString()}`,
        `-- Source: ${SUPABASE_URL}`,
        `-- Tables: sponsors (${sponsors.length}), events (${events.length}),`,
        `--         settings (${settings.length}), slides (${slides.length})`,
        '--',
        '-- Load command:',
        '--   wrangler d1 execute backgroundclima --remote --file=scripts/backfill-d1-output.sql',
        '-- ==========================================================',
        '',
        'PRAGMA foreign_keys = OFF;',
        '',
    ].join('\n');

    const footer = [
        '',
        'PRAGMA foreign_keys = ON;',
        '',
        `-- End of backfill — ${sponsors.length + events.length + settings.length + slides.length} total rows`,
        '',
    ].join('\n');

    const sections = [
        `-- --------------------------------------------------------\n-- sponsors (${sponsors.length} rows)\n-- --------------------------------------------------------\n`,
        generateSponsorsSQL(sponsors),
        `\n-- --------------------------------------------------------\n-- events (${events.length} rows)\n-- --------------------------------------------------------\n`,
        generateEventsSQL(events),
        `\n-- --------------------------------------------------------\n-- settings (${settings.length} rows)\n-- --------------------------------------------------------\n`,
        generateSettingsSQL(settings),
        `\n-- --------------------------------------------------------\n-- slides (${slides.length} rows — inserted after sponsors for FK safety)\n-- --------------------------------------------------------\n`,
        generateSlidesSQL(slides),
    ];

    const sql = header + sections.join('') + footer;

    writeFileSync(OUT_PATH, sql, 'utf8');

    console.log(`\n[backfill-d1] SQL file written to: ${OUT_PATH}`);
    console.log('[backfill-d1] Next steps:');
    console.log(
        '  1. Smoke-test locally:  wrangler d1 execute backgroundclima --local  --file=scripts/backfill-d1-output.sql',
    );
    console.log(
        '  2. Apply to prod:       wrangler d1 execute backgroundclima --remote --file=scripts/backfill-d1-output.sql',
    );
    console.log(
        '  3. Verify row counts:   wrangler d1 execute backgroundclima --remote --command "SELECT (SELECT COUNT(*) FROM sponsors) AS sponsors, (SELECT COUNT(*) FROM events) AS events, (SELECT COUNT(*) FROM settings) AS settings, (SELECT COUNT(*) FROM slides) AS slides;"',
    );
}

main().catch((err) => {
    console.error('[backfill-d1] Fatal error:', err);
    process.exit(1);
});

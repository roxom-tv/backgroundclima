import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
    eventsTable,
    parseActiveDays,
    parseGlobalSettings,
    parseScheduleTimes,
    parseSelectedEventIds,
    parseSlideScheduleTimes,
    settingsTable,
    slidesTable,
    sponsorsTable,
} from '@/lib/db/schema';
import type {
    CalendarEvent as CalendarEventRow,
    GlobalSettings,
    ScheduleTime,
    Slide as SlideRow,
    Sponsor,
} from '@/lib/db/schema';

/**
 * Display-path slide shape: identical to the persisted Drizzle row except the
 * JSON-encoded text columns are parsed into real objects/arrays at the boundary.
 * This is the shape the public display + admin consumers expect.
 */
export type Slide = Omit<SlideRow, 'schedule_times' | 'selected_event_ids' | 'active_days'> & {
    schedule_times: ScheduleTime[] | null;
    selected_event_ids: string[] | null;
    active_days: number[] | null;
};

/**
 * Display-path event shape: identical to the persisted Drizzle row except the
 * JSON-encoded `schedule_times` column is parsed into a real array.
 */
export type CalendarEvent = Omit<CalendarEventRow, 'schedule_times'> & {
    schedule_times: ScheduleTime[] | null;
};

export type { GlobalSettings, Sponsor };

export interface AppConfigSnapshot {
    slides: Slide[];
    settings: GlobalSettings;
    sponsors: Sponsor[];
    events: CalendarEvent[];
    version: string;
    generatedAt: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
    show_sponsors: true,
    show_live_indicator: true,
    transition_effect: 'tv_static',
    default_duration_seconds: 25,
};

function resolveVersionTimestamps(values: Array<string | null | undefined>): string {
    let latest = 0;

    for (const value of values) {
        if (!value) {
            continue;
        }
        const timestamp = Date.parse(value);

        if (!Number.isNaN(timestamp) && timestamp > latest) {
            latest = timestamp;
        }
    }

    // Stable fallback so clients have deterministic initial version.
    return latest > 0 ? new Date(latest).toISOString() : '1970-01-01T00:00:00.000Z';
}

function toSlide(row: SlideRow): Slide {
    return {
        ...row,
        schedule_times: parseSlideScheduleTimes(row.schedule_times),
        selected_event_ids: parseSelectedEventIds(row.selected_event_ids),
        active_days: parseActiveDays(row.active_days),
    };
}

function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
    return {
        ...row,
        schedule_times: parseScheduleTimes(row.schedule_times),
    };
}

export async function getConfigSnapshot(): Promise<AppConfigSnapshot> {
    const db = await getDb();

    const [slideRows, settingsRows, sponsorRows, eventRows] = await Promise.all([
        db
            .select()
            .from(slidesTable)
            .where(eq(slidesTable.is_active, true))
            .orderBy(slidesTable.order_index),
        db.select().from(settingsTable).where(eq(settingsTable.key, 'global')).limit(1),
        db
            .select()
            .from(sponsorsTable)
            .where(eq(sponsorsTable.is_active, true))
            .orderBy(sponsorsTable.order_index),
        db
            .select()
            .from(eventsTable)
            .where(eq(eventsTable.is_active, true))
            .orderBy(eventsTable.start_date),
    ]);

    const slides = slideRows.map(toSlide);
    const sponsors = sponsorRows;
    const events = eventRows.map(toCalendarEvent);

    const settingsRow = settingsRows[0] ?? null;
    const settings = settingsRow ? parseGlobalSettings(settingsRow.value) : DEFAULT_SETTINGS;

    const version = resolveVersionTimestamps([
        ...slideRows.map((slide) => slide.updated_at),
        settingsRow?.updated_at,
        ...sponsors.map((sponsor) => sponsor.updated_at),
        ...eventRows.map((event) => event.updated_at),
    ]);

    return {
        slides,
        settings,
        sponsors,
        events,
        version,
        generatedAt: new Date().toISOString(),
    };
}

export async function getConfigVersion(): Promise<string> {
    const db = await getDb();

    const [slideRows, settingsRows, sponsorRows, eventRows] = await Promise.all([
        db
            .select({ updated_at: slidesTable.updated_at })
            .from(slidesTable)
            .where(eq(slidesTable.is_active, true))
            .orderBy(desc(slidesTable.updated_at))
            .limit(1),
        db
            .select({ updated_at: settingsTable.updated_at })
            .from(settingsTable)
            .where(eq(settingsTable.key, 'global'))
            .limit(1),
        db
            .select({ updated_at: sponsorsTable.updated_at })
            .from(sponsorsTable)
            .where(eq(sponsorsTable.is_active, true))
            .orderBy(desc(sponsorsTable.updated_at))
            .limit(1),
        db
            .select({ updated_at: eventsTable.updated_at })
            .from(eventsTable)
            .where(eq(eventsTable.is_active, true))
            .orderBy(desc(eventsTable.updated_at))
            .limit(1),
    ]);

    return resolveVersionTimestamps([
        slideRows[0]?.updated_at,
        settingsRows[0]?.updated_at,
        sponsorRows[0]?.updated_at,
        eventRows[0]?.updated_at,
    ]);
}

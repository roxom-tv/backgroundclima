import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod/v4';
import { sponsorsTable } from './sponsors';
import { ScheduleTimeSchema } from './events';

export const SlideTypeSchema = z.enum([
    'youtube',
    'debt',
    'metals',
    'fx',
    'market',
    'show',
    'event',
    'calendar',
    'news',
    'video',
    'strc',
    'sata',
]);
export type SlideType = z.infer<typeof SlideTypeSchema>;

export const LayoutOrientationSchema = z.enum(['horizontal', 'vertical']);
export type LayoutOrientation = z.infer<typeof LayoutOrientationSchema>;

export const EventSlideStyleSchema = z.enum(['classic', 'modern']);
export type EventSlideStyle = z.infer<typeof EventSlideStyleSchema>;

export function parseSlideScheduleTimes(
    raw: string | null,
): z.infer<typeof ScheduleTimeSchema>[] | null {
    if (raw === null) {
        return null;
    }

    return z.array(ScheduleTimeSchema).parse(JSON.parse(raw));
}

export function stringifySlideScheduleTimes(
    value: z.infer<typeof ScheduleTimeSchema>[] | null,
): string | null {
    if (value === null) {
        return null;
    }

    return JSON.stringify(value);
}

export function parseSelectedEventIds(raw: string | null): string[] | null {
    if (raw === null) {
        return null;
    }

    return z.array(z.string()).parse(JSON.parse(raw));
}

export function stringifySelectedEventIds(value: string[] | null): string | null {
    if (value === null) {
        return null;
    }

    return JSON.stringify(value);
}

export function parseActiveDays(raw: string | null): number[] | null {
    if (raw === null) {
        return null;
    }

    return z.array(z.number().int().min(0).max(6)).parse(JSON.parse(raw));
}

export function stringifyActiveDays(value: number[] | null): string | null {
    if (value === null) {
        return null;
    }

    return JSON.stringify(value);
}

export const slidesTable = sqliteTable('slides', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    type: text('type').notNull().default('youtube'),
    name: text('name').notNull(),
    country: text('country'),
    youtube_url: text('youtube_url'),
    weather_query: text('weather_query'),
    timezone: text('timezone'),
    duration_seconds: integer('duration_seconds').notNull().default(25),
    order_index: integer('order_index').notNull().default(0),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    show_weather: integer('show_weather', { mode: 'boolean' }).notNull().default(true),
    show_sponsor: integer('show_sponsor', { mode: 'boolean' }).notNull().default(true),
    // Event fields
    description: text('description'),
    image_url: text('image_url'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    start_time: text('start_time'),
    end_time: text('end_time'),
    color: text('color'),
    // Sponsor selection (legacy + multi-position)
    sponsor_id: text('sponsor_id').references(() => sponsorsTable.id, { onDelete: 'set null' }),
    sponsor_top_left: text('sponsor_top_left').references(() => sponsorsTable.id, {
        onDelete: 'set null',
    }),
    sponsor_top_right: text('sponsor_top_right').references(() => sponsorsTable.id, {
        onDelete: 'set null',
    }),
    sponsor_bottom_left: text('sponsor_bottom_left').references(() => sponsorsTable.id, {
        onDelete: 'set null',
    }),
    sponsor_bottom_right: text('sponsor_bottom_right').references(() => sponsorsTable.id, {
        onDelete: 'set null',
    }),
    // Show slide fields
    host_name: text('host_name'),
    show_days: text('show_days'),
    // JSON: ScheduleTime[] — use parseSlideScheduleTimes/stringifySlideScheduleTimes helpers
    schedule_times: text('schedule_times'),
    // JSON: string[] — use parseSelectedEventIds/stringifySelectedEventIds helpers
    selected_event_ids: text('selected_event_ids'),
    layout_orientation: text('layout_orientation').default('horizontal'),
    event_slide_style: text('event_slide_style').default('classic'),
    event_slide_title: text('event_slide_title'),
    // News slide fields
    headline: text('headline'),
    source: text('source'),
    // Video slide fields
    video_url: text('video_url'),
    loop_count: integer('loop_count'),
    // UTC schedule: JSON number[] — use parseActiveDays/stringifyActiveDays helpers
    active_days: text('active_days'),
    active_time_start: text('active_time_start'),
    active_time_end: text('active_time_end'),
    created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
    updated_at: text('updated_at')
        .$defaultFn(() => new Date().toISOString())
        .$onUpdate(() => new Date().toISOString()),
});

export type Slide = InferSelectModel<typeof slidesTable>;
export type NewSlide = InferInsertModel<typeof slidesTable>;

export const SlideSchema = z.object({
    id: z.string(),
    type: SlideTypeSchema,
    name: z.string(),
    country: z.string().nullable(),
    youtube_url: z.string().nullable(),
    weather_query: z.string().nullable(),
    timezone: z.string().nullable(),
    duration_seconds: z.number().int(),
    order_index: z.number().int(),
    is_active: z.boolean(),
    show_weather: z.boolean(),
    show_sponsor: z.boolean(),
    description: z.string().nullable(),
    image_url: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    color: z.string().nullable(),
    sponsor_id: z.string().nullable(),
    sponsor_top_left: z.string().nullable(),
    sponsor_top_right: z.string().nullable(),
    sponsor_bottom_left: z.string().nullable(),
    sponsor_bottom_right: z.string().nullable(),
    host_name: z.string().nullable(),
    show_days: z.string().nullable(),
    schedule_times: z.string().nullable(),
    selected_event_ids: z.string().nullable(),
    layout_orientation: z.string().nullable(),
    event_slide_style: z.string().nullable(),
    event_slide_title: z.string().nullable(),
    headline: z.string().nullable(),
    source: z.string().nullable(),
    video_url: z.string().nullable(),
    loop_count: z.number().int().nullable(),
    active_days: z.string().nullable(),
    active_time_start: z.string().nullable(),
    active_time_end: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

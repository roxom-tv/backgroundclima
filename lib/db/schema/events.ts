import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod/v4';

export const EventTextSizeSchema = z.enum(['small', 'medium', 'large', 'xlarge']);
export type EventTextSize = z.infer<typeof EventTextSizeSchema>;

export const ScheduleTimeSchema = z.object({
    timezone: z.string(),
    time: z.string(),
});
export type ScheduleTime = z.infer<typeof ScheduleTimeSchema>;

export function parseScheduleTimes(raw: string | null): ScheduleTime[] | null {
    if (raw === null) {
        return null;
    }

    return z.array(ScheduleTimeSchema).parse(JSON.parse(raw));
}

export function stringifyScheduleTimes(value: ScheduleTime[] | null): string | null {
    if (value === null) {
        return null;
    }

    return JSON.stringify(value);
}

export const eventsTable = sqliteTable('events', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description'),
    image_url: text('image_url'),
    start_date: text('start_date').notNull(),
    end_date: text('end_date'),
    start_time: text('start_time'),
    end_time: text('end_time'),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    order_index: integer('order_index').notNull().default(0),
    color: text('color').notNull().default('#3B82F6'),
    title_font: text('title_font').default('Inter'),
    title_size: text('title_size').default('large'),
    title_color: text('title_color').default('#FFFFFF'),
    text_color: text('text_color').default('#F3F4F6'),
    overlay_opacity: integer('overlay_opacity').default(50),
    show_date_badge: integer('show_date_badge', { mode: 'boolean' }).notNull().default(true),
    location: text('location'),
    schedule_times: text('schedule_times'),
    created_at: text('created_at').$defaultFn(() => new Date().toISOString()),
    updated_at: text('updated_at')
        .$defaultFn(() => new Date().toISOString())
        .$onUpdate(() => new Date().toISOString()),
});

export type CalendarEvent = InferSelectModel<typeof eventsTable>;
export type NewCalendarEvent = InferInsertModel<typeof eventsTable>;

export const CalendarEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    image_url: z.string().nullable(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    is_active: z.boolean(),
    order_index: z.number().int(),
    color: z.string(),
    title_font: z.string().nullable(),
    title_size: EventTextSizeSchema.nullable(),
    title_color: z.string().nullable(),
    text_color: z.string().nullable(),
    overlay_opacity: z.number().int().nullable(),
    show_date_badge: z.boolean(),
    location: z.string().nullable(),
    schedule_times: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

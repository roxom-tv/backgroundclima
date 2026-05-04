import { z } from 'zod';

const scheduleTimeSchema = z.object({
    timezone: z.string(),
    time: z.string(),
});

const slideTypeSchema = z.enum([
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

const layoutOrientationSchema = z.enum(['horizontal', 'vertical']);
const eventSlideStyleSchema = z.enum(['classic', 'modern']);

export const slideInsertSchema = z.object({
    type: slideTypeSchema,
    name: z.string(),
    country: z.string().nullable().optional(),
    youtube_url: z.string().nullable().optional(),
    weather_query: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    duration_seconds: z.number().optional(),
    order_index: z.number().optional(),
    is_active: z.boolean().optional(),
    show_weather: z.boolean().optional(),
    show_sponsor: z.boolean().optional(),
    description: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    sponsor_id: z.string().nullable().optional(),
    sponsor_top_left: z.string().nullable().optional(),
    sponsor_top_right: z.string().nullable().optional(),
    sponsor_bottom_left: z.string().nullable().optional(),
    sponsor_bottom_right: z.string().nullable().optional(),
    host_name: z.string().nullable().optional(),
    show_days: z.string().nullable().optional(),
    schedule_times: z.array(scheduleTimeSchema).nullable().optional(),
    selected_event_ids: z.array(z.string()).nullable().optional(),
    layout_orientation: layoutOrientationSchema.nullable().optional(),
    event_slide_style: eventSlideStyleSchema.nullable().optional(),
    event_slide_title: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    video_url: z.string().nullable().optional(),
    loop_count: z.number().nullable().optional(),
});

export const slideUpdateSchema = slideInsertSchema.partial();

export const sponsorInsertSchema = z.object({
    name: z.string(),
    logo_url: z.string().nullable().optional(),
    website_url: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    order_index: z.number().optional(),
});

export const sponsorUpdateSchema = sponsorInsertSchema.partial();

const eventTextSizeSchema = z.enum(['small', 'medium', 'large', 'xlarge']);

export const eventInsertSchema = z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    order_index: z.number().optional(),
    color: z.string().optional(),
    title_font: z.string().nullable().optional(),
    title_size: eventTextSizeSchema.nullable().optional(),
    title_color: z.string().nullable().optional(),
    text_color: z.string().nullable().optional(),
    overlay_opacity: z.number().nullable().optional(),
    show_date_badge: z.boolean().optional(),
    location: z.string().nullable().optional(),
    schedule_times: z.array(scheduleTimeSchema).nullable().optional(),
});

export const eventUpdateSchema = eventInsertSchema.partial();

export const globalSettingsSchema = z.object({
    show_sponsors: z.boolean(),
    show_live_indicator: z.boolean(),
    transition_effect: z.enum(['tv_static', 'fade', 'slide', 'none']),
    default_duration_seconds: z.number(),
});

export const settingsUpsertSchema = z.object({
    key: z.literal('global').default('global'),
    value: globalSettingsSchema,
});

/**
 * Admin + display domain types.
 *
 * Row/display shapes and enums are re-exported from the Drizzle schema and the
 * config-service display layer (the canonical sources after the D1/Drizzle
 * migration). The Insert/Update shapes below are the write-side payloads used by
 * the admin forms and hooks. They are structurally identical to the shapes that
 * previously lived in the removed legacy database types module, with the JSON-encoded
 * columns (`schedule_times`, `selected_event_ids`, `active_days`) expressed as
 * parsed arrays at this boundary.
 */

import type {
    EventSlideStyle,
    EventTextSize,
    LayoutOrientation,
    ScheduleTime,
    SlideType,
    TransitionEffect,
} from '@/lib/db/schema';

export type {
    EventSlideStyle,
    EventTextSize,
    LayoutOrientation,
    ScheduleTime,
    SlideType,
    TransitionEffect,
};

// Display-shaped row types (parsed arrays at the boundary).
import type {
    CalendarEvent as CalendarEventDisplayRow,
    Slide as SlideDisplayRow,
} from '@/lib/config/config-service';

export type { GlobalSettings, Sponsor } from '@/lib/config/config-service';

/**
 * Display-path Slide for the admin + render consumers. Identical to the
 * config-service display row, but the enum-backed text columns are narrowed to
 * their union types (the persisted Drizzle row leaves them as plain `string`).
 * This matches the shape the consumers and form payloads relied on previously.
 */
export type Slide = Omit<SlideDisplayRow, 'type' | 'layout_orientation' | 'event_slide_style'> & {
    type: SlideType;
    layout_orientation: LayoutOrientation | null;
    event_slide_style: EventSlideStyle | null;
};

/**
 * Display-path CalendarEvent for the admin consumers, with `title_size`
 * narrowed to its union type.
 */
export type CalendarEvent = Omit<CalendarEventDisplayRow, 'title_size'> & {
    title_size: EventTextSize | null;
};

export type SponsorPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

export interface SlideInsert {
    type: SlideType;
    name: string;
    country?: string | null;
    youtube_url?: string | null;
    weather_query?: string | null;
    timezone?: string | null;
    duration_seconds?: number;
    order_index?: number;
    is_active?: boolean;
    show_weather?: boolean;
    show_sponsor?: boolean;
    // Event fields
    description?: string | null;
    image_url?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    color?: string | null;
    // Sponsor selection (legacy)
    sponsor_id?: string | null;
    // Multi-position sponsors
    sponsor_top_left?: string | null;
    sponsor_top_right?: string | null;
    sponsor_bottom_left?: string | null;
    sponsor_bottom_right?: string | null;
    // Show slide fields
    host_name?: string | null;
    show_days?: string | null;
    schedule_times?: ScheduleTime[] | null;
    // Event slide with multiple events
    selected_event_ids?: string[] | null;
    layout_orientation?: LayoutOrientation | null;
    event_slide_style?: EventSlideStyle | null;
    event_slide_title?: string | null;
    // News slide fields
    headline?: string | null;
    source?: string | null;
    // Video slide fields
    video_url?: string | null;
    loop_count?: number | null;
    // UTC schedule
    active_days?: number[] | null;
    active_time_start?: string | null;
    active_time_end?: string | null;
}

export interface SlideUpdate {
    type?: SlideType;
    name?: string;
    country?: string | null;
    youtube_url?: string | null;
    weather_query?: string | null;
    timezone?: string | null;
    duration_seconds?: number;
    order_index?: number;
    is_active?: boolean;
    show_weather?: boolean;
    show_sponsor?: boolean;
    // Event fields
    description?: string | null;
    image_url?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    color?: string | null;
    // Sponsor selection (legacy)
    sponsor_id?: string | null;
    // Multi-position sponsors
    sponsor_top_left?: string | null;
    sponsor_top_right?: string | null;
    sponsor_bottom_left?: string | null;
    sponsor_bottom_right?: string | null;
    // Show slide fields
    host_name?: string | null;
    show_days?: string | null;
    schedule_times?: ScheduleTime[] | null;
    // Event slide with multiple events
    selected_event_ids?: string[] | null;
    layout_orientation?: LayoutOrientation | null;
    event_slide_style?: EventSlideStyle | null;
    event_slide_title?: string | null;
    // News slide fields
    headline?: string | null;
    source?: string | null;
    // Video slide fields
    video_url?: string | null;
    loop_count?: number | null;
    // UTC schedule
    active_days?: number[] | null;
    active_time_start?: string | null;
    active_time_end?: string | null;
}

export interface SponsorInsert {
    name: string;
    logo_url?: string | null;
    website_url?: string | null;
    is_active?: boolean;
    order_index?: number;
}

export interface SponsorUpdate {
    name?: string;
    logo_url?: string | null;
    website_url?: string | null;
    is_active?: boolean;
    order_index?: number;
}

export interface CalendarEventInsert {
    title: string;
    description?: string | null;
    image_url?: string | null;
    start_date: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    is_active?: boolean;
    order_index?: number;
    color?: string;
    // Style customization
    title_font?: string | null;
    title_size?: EventTextSize | null;
    title_color?: string | null;
    text_color?: string | null;
    overlay_opacity?: number | null;
    show_date_badge?: boolean;
    // Location/source
    location?: string | null;
    // Multiple timezone times
    schedule_times?: ScheduleTime[] | null;
}

export interface CalendarEventUpdate {
    title?: string;
    description?: string | null;
    image_url?: string | null;
    start_date?: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    is_active?: boolean;
    order_index?: number;
    color?: string;
    // Style customization
    title_font?: string | null;
    title_size?: EventTextSize | null;
    title_color?: string | null;
    text_color?: string | null;
    overlay_opacity?: number | null;
    show_date_badge?: boolean;
    // Location/source
    location?: string | null;
    // Multiple timezone times
    schedule_times?: ScheduleTime[] | null;
}

/**
 * Database types for Supabase
 * These match the schema defined in supabase/migrations/001_initial_schema.sql
 */

export type SlideType =
    | 'youtube'
    | 'debt'
    | 'metals'
    | 'fx'
    | 'market'
    | 'show'
    | 'event'
    | 'calendar'
    | 'news'
    | 'video'
    | 'strc'
    | 'sata'
    | 'earth'
    | 'earthcam';
export type TransitionEffect = 'tv_static' | 'fade' | 'slide' | 'none';
export type LayoutOrientation = 'horizontal' | 'vertical';
export type EventSlideStyle = 'classic' | 'modern';
export type SponsorPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

// Schedule time for show slides
export interface ScheduleTime {
    timezone: string;
    time: string;
}

export interface Slide {
    id: string;
    type: SlideType;
    name: string;
    country: string | null;
    youtube_url: string | null;
    weather_query: string | null;
    timezone: string | null;
    duration_seconds: number;
    order_index: number;
    is_active: boolean;
    show_weather: boolean;
    show_sponsor: boolean;
    // Event fields (for type 'event')
    description: string | null;
    image_url: string | null;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    color: string | null;
    // Sponsor selection (legacy - use position-based fields)
    sponsor_id: string | null;
    // Multi-position sponsors
    sponsor_top_left: string | null;
    sponsor_top_right: string | null;
    sponsor_bottom_left: string | null;
    sponsor_bottom_right: string | null;
    // Show slide fields
    host_name: string | null;
    show_days: string | null;
    schedule_times: ScheduleTime[] | null;
    // Event slide with multiple events
    selected_event_ids: string[] | null;
    layout_orientation: LayoutOrientation | null;
    event_slide_style: EventSlideStyle | null;
    event_slide_title: string | null;
    // News slide fields
    headline: string | null;
    source: string | null;
    // Video slide fields
    video_url: string | null;
    loop_count: number | null;
    // UTC schedule: active days (0=Sun…6=Sat) and time window (HH:MM)
    active_days: number[] | null;
    active_time_start: string | null;
    active_time_end: string | null;
    created_at: string;
    updated_at: string;
}

export interface Settings {
    id: string;
    key: string;
    value: GlobalSettings;
    updated_at: string;
}

export interface GlobalSettings {
    show_sponsors: boolean;
    show_live_indicator: boolean;
    transition_effect: TransitionEffect;
    default_duration_seconds: number;
}

export interface Sponsor {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
    is_active: boolean;
    order_index: number;
    created_at: string;
    updated_at: string;
}

// Insert types (without auto-generated fields)
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

// Event text size options
export type EventTextSize = 'small' | 'medium' | 'large' | 'xlarge';

// Calendar Events
export interface CalendarEvent {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    start_date: string; // DATE as ISO string
    end_date: string | null;
    start_time: string | null; // TIME as string HH:MM:SS
    end_time: string | null;
    is_active: boolean;
    order_index: number;
    color: string;
    // Style customization
    title_font: string | null;
    title_size: EventTextSize | null;
    title_color: string | null;
    text_color: string | null;
    overlay_opacity: number | null;
    show_date_badge: boolean;
    // Location/source
    location: string | null;
    // Multiple timezone times
    schedule_times: ScheduleTime[] | null;
    created_at: string;
    updated_at: string;
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

// Database schema type for Supabase client
export interface Database {
    public: {
        Tables: {
            slides: {
                Row: Slide;
                Insert: SlideInsert;
                Update: SlideUpdate;
            };
            settings: {
                Row: Settings;
                Insert: { key: string; value: GlobalSettings };
                Update: { key?: string; value?: GlobalSettings };
            };
            sponsors: {
                Row: Sponsor;
                Insert: SponsorInsert;
                Update: SponsorUpdate;
            };
            events: {
                Row: CalendarEvent;
                Insert: CalendarEventInsert;
                Update: CalendarEventUpdate;
            };
        };
    };
}

import type { CalendarEvent, GlobalSettings, Slide, Sponsor } from '@/lib/supabase/types';
import { createServerAdminSupabaseClient } from '@/lib/supabase/admin';

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

export async function getConfigSnapshot(): Promise<AppConfigSnapshot> {
    const supabase = createServerAdminSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = (table: string) => supabase.from(table) as any;

    const [slidesRes, settingsRes, sponsorsRes, eventsRes] = await Promise.all([
        from('slides').select('*').eq('is_active', true).order('order_index', { ascending: true }),
        from('settings').select('*').eq('key', 'global').single(),
        from('sponsors')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true }),
        from('events').select('*').eq('is_active', true).order('start_date', { ascending: true }),
    ]);

    if (slidesRes.error) {
        throw new Error(`Failed to fetch slides: ${slidesRes.error.message}`);
    }
    if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch settings: ${settingsRes.error.message}`);
    }
    if (sponsorsRes.error) {
        throw new Error(`Failed to fetch sponsors: ${sponsorsRes.error.message}`);
    }
    if (eventsRes.error && eventsRes.error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch events: ${eventsRes.error.message}`);
    }

    const slides = (slidesRes.data as Slide[]) || [];
    const settingsRow = settingsRes.data as { value: GlobalSettings; updated_at?: string } | null;
    const sponsors = (sponsorsRes.data as Sponsor[]) || [];
    const events = (eventsRes.data as CalendarEvent[]) || [];

    const version = resolveVersionTimestamps([
        ...slides.map((slide) => slide.updated_at),
        settingsRow?.updated_at,
        ...sponsors.map((sponsor) => sponsor.updated_at),
        ...events.map((event) => event.updated_at),
    ]);

    return {
        slides,
        settings: settingsRow?.value || DEFAULT_SETTINGS,
        sponsors,
        events,
        version,
        generatedAt: new Date().toISOString(),
    };
}

export async function getConfigVersion(): Promise<string> {
    const supabase = createServerAdminSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = (table: string) => supabase.from(table) as any;

    const [slidesRes, settingsRes, sponsorsRes, eventsRes] = await Promise.all([
        from('slides')
            .select('updated_at')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1),
        from('settings').select('updated_at').eq('key', 'global').limit(1),
        from('sponsors')
            .select('updated_at')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1),
        from('events')
            .select('updated_at')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1),
    ]);

    if (slidesRes.error) {
        throw new Error(`Failed to fetch config version (slides): ${slidesRes.error.message}`);
    }
    if (settingsRes.error) {
        throw new Error(`Failed to fetch config version (settings): ${settingsRes.error.message}`);
    }
    if (sponsorsRes.error) {
        throw new Error(`Failed to fetch config version (sponsors): ${sponsorsRes.error.message}`);
    }
    if (eventsRes.error) {
        throw new Error(`Failed to fetch config version (events): ${eventsRes.error.message}`);
    }

    return resolveVersionTimestamps([
        slidesRes.data?.[0]?.updated_at as string | undefined,
        settingsRes.data?.[0]?.updated_at as string | undefined,
        sponsorsRes.data?.[0]?.updated_at as string | undefined,
        eventsRes.data?.[0]?.updated_at as string | undefined,
    ]);
}

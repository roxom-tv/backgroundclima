'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Slide, Sponsor, GlobalSettings, CalendarEvent } from '@/lib/supabase/types';

interface RealtimeConfig {
  slides: Slide[];
  settings: GlobalSettings;
  sponsors: Sponsor[];
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  show_sponsors: true,
  show_live_indicator: true,
  transition_effect: 'tv_static',
  default_duration_seconds: 25,
};

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('your-project') || url.includes('placeholder')) return false;
  if (key === 'your-anon-key-here' || key === 'placeholder-key') return false;
  return true;
}

/**
 * Hook that provides real-time configuration data from Supabase
 * Subscribes to changes in slides, settings, and sponsors tables
 * When Supabase is not configured, returns empty data without errors
 */
export function useRealtimeConfig(): RealtimeConfig {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = (table: string) => supabase.from(table) as any;

    try {
      // Fetch slides (only active, ordered)
      const { data: slidesData, error: slidesError } = await from('slides')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (slidesError) console.warn('Slides fetch failed:', slidesError.message || slidesError);
      setSlides((slidesData as Slide[]) || []);

      // Fetch settings
      const { data: settingsRaw, error: settingsError } = await from('settings')
        .select('*')
        .eq('key', 'global')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.warn('Settings fetch failed:', settingsError.message || settingsError);
      }
      const settingsData = settingsRaw as { value: GlobalSettings } | null;
      setSettings(settingsData?.value || DEFAULT_SETTINGS);

      // Fetch sponsors (only active, ordered)
      const { data: sponsorsData, error: sponsorsError } = await from('sponsors')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (sponsorsError) console.warn('Sponsors fetch failed:', sponsorsError.message || sponsorsError);
      setSponsors((sponsorsData as Sponsor[]) || []);

      // Fetch events (only active, ordered by date)
      const { data: eventsData, error: eventsError } = await from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (eventsError && eventsError.code !== 'PGRST116') {
        console.warn('Events fetch failed:', eventsError.message || eventsError);
      }
      setEvents((eventsData as CalendarEvent[]) || []);

      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err) ? String((err as { message?: unknown }).message) : 'Failed to fetch configuration';
      console.warn('Config fetch error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle realtime updates
  useEffect(() => {
    fetchInitialData();

    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();

    // Subscribe to slides changes
    const slidesChannel = supabase
      .channel('slides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slides',
        },
        () => {
          console.log('Slides change detected');
          // Refetch all slides to maintain order
          fetchInitialData();
        }
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
        },
        (payload) => {
          console.log('Settings change:', payload);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newData = payload.new as any;
          if (newData && newData.value) {
            setSettings(newData.value as GlobalSettings);
          }
        }
      )
      .subscribe();

    // Subscribe to sponsors changes
    const sponsorsChannel = supabase
      .channel('sponsors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sponsors',
        },
        () => {
          console.log('Sponsors change detected');
          // Refetch all sponsors to maintain order
          fetchInitialData();
        }
      )
      .subscribe();

    // Subscribe to events changes
    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          console.log('Events change detected');
          // Refetch all events to maintain order
          fetchInitialData();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(slidesChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(sponsorsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [fetchInitialData]);

  return {
    slides,
    settings,
    sponsors,
    events,
    isLoading,
    error,
  };
}

/**
 * Helper hook to get only active YouTube slides
 */
export function useYouTubeSlides() {
  const { slides, isLoading, error } = useRealtimeConfig();
  
  const youtubeSlides = slides.filter(slide => slide.type === 'youtube');
  
  return { slides: youtubeSlides, isLoading, error };
}

/**
 * Helper hook to get special slides (debt, calendar, etc.)
 */
export function useSpecialSlides() {
  const { slides, isLoading, error } = useRealtimeConfig();
  
  const specialSlides = slides.filter(slide => slide.type !== 'youtube');
  
  return { slides: specialSlides, isLoading, error };
}



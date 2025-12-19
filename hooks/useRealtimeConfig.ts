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

/**
 * Hook that provides real-time configuration data from Supabase
 * Subscribes to changes in slides, settings, and sponsors tables
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
    try {
      const supabase = getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slidesTable = supabase.from('slides') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settingsTable = supabase.from('settings') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sponsorsTable = supabase.from('sponsors') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventsTable = supabase.from('events') as any;

      // Fetch slides (only active, ordered)
      const { data: slidesData, error: slidesError } = await slidesTable
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (slidesError) throw slidesError;

      // Fetch settings
      const { data: settingsRaw, error: settingsError } = await settingsTable
        .select('*')
        .eq('key', 'global')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      const settingsData = settingsRaw as { value: GlobalSettings } | null;

      // Fetch sponsors (only active, ordered)
      const { data: sponsorsData, error: sponsorsError } = await sponsorsTable
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (sponsorsError) throw sponsorsError;

      // Fetch events (only active, ordered by date)
      const { data: eventsData, error: eventsError } = await eventsTable
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      if (eventsError && eventsError.code !== 'PGRST116') {
        console.warn('Events table may not exist yet:', eventsError);
      }

      setSlides((slidesData as Slide[]) || []);
      setSettings(settingsData?.value || DEFAULT_SETTINGS);
      setSponsors((sponsorsData as Sponsor[]) || []);
      setEvents((eventsData as CalendarEvent[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle realtime updates
  useEffect(() => {
    fetchInitialData();

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



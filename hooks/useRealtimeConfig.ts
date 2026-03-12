'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Slide, Sponsor, GlobalSettings, CalendarEvent } from '@/lib/supabase/types';

interface RealtimeConfig {
  slides: Slide[];
  settings: GlobalSettings;
  sponsors: Sponsor[];
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
}

interface ConfigApiResponse {
  slides: Slide[];
  settings: GlobalSettings;
  sponsors: Sponsor[];
  events: CalendarEvent[];
  version: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  show_sponsors: true,
  show_live_indicator: true,
  transition_effect: 'tv_static',
  default_duration_seconds: 25,
};

const VERSION_POLL_INTERVAL_MS = 10000;

/**
 * Hook that provides server-fetched configuration data with lightweight version polling.
 * This avoids keeping client WebSocket connections open while still updating quickly.
 */
export function useRealtimeConfig(): RealtimeConfig {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentVersionRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/config', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Config API returned ${response.status}`);
      }

      const data = (await response.json()) as ConfigApiResponse;
      setSlides(data.slides || []);
      setSettings(data.settings || DEFAULT_SETTINGS);
      setSponsors(data.sponsors || []);
      setEvents(data.events || []);
      currentVersionRef.current = data.version || null;

      if (error !== null) setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch configuration';
      console.warn('Config fetch error:', msg, err);
      setError(msg);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [error]);

  const checkVersionAndRefresh = useCallback(async () => {
    try {
      const response = await fetch('/api/config/version', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Version API returned ${response.status}`);
      }

      const data = (await response.json()) as { version?: string };
      const latestVersion = data.version || null;
      if (!latestVersion) return;

      if (!currentVersionRef.current) {
        currentVersionRef.current = latestVersion;
        return;
      }

      if (latestVersion !== currentVersionRef.current) {
        await fetchConfig({ silent: true });
      }
    } catch (err) {
      // Keep UI stable on version endpoint failures; next interval can recover.
      console.warn('Version check failed:', err);
    }
  }, [fetchConfig]);

  useEffect(() => {
    fetchConfig();
    const intervalId = setInterval(checkVersionAndRefresh, VERSION_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchConfig, checkVersionAndRefresh]);

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

  const youtubeSlides = slides.filter((slide) => slide.type === 'youtube');

  return { slides: youtubeSlides, isLoading, error };
}

/**
 * Helper hook to get special slides (debt, calendar, etc.)
 */
export function useSpecialSlides() {
  const { slides, isLoading, error } = useRealtimeConfig();

  const specialSlides = slides.filter((slide) => slide.type !== 'youtube');

  return { slides: specialSlides, isLoading, error };
}



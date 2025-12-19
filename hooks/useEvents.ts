'use client';

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { CalendarEvent, CalendarEventInsert, CalendarEventUpdate } from '@/lib/supabase/types';

// Helper to get typed table access
const getEventsTable = (supabase: ReturnType<typeof getSupabaseClient>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('events') as any;
};

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getEventsTable(supabase)
        .select('*')
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      setEvents((data as CalendarEvent[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Create event
  const createEvent = useCallback(async (eventData: CalendarEventInsert) => {
    try {
      // Get max order_index
      const { data: maxOrderRaw } = await getEventsTable(supabase)
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const maxOrderData = maxOrderRaw as { order_index: number } | null;
      const newOrderIndex = (maxOrderData?.order_index ?? -1) + 1;

      const { data, error: insertError } = await getEventsTable(supabase)
        .insert({ ...eventData, order_index: newOrderIndex })
        .select()
        .single();

      if (insertError) throw insertError;

      setEvents(prev => [...prev, data as CalendarEvent]);
      return { data: data as CalendarEvent, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      return { data: null, error: message };
    }
  }, [supabase]);

  // Update event
  const updateEvent = useCallback(async (id: string, updates: CalendarEventUpdate) => {
    try {
      const { data, error: updateError } = await getEventsTable(supabase)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setEvents(prev => prev.map(e => e.id === id ? (data as CalendarEvent) : e));
      return { data: data as CalendarEvent, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      return { data: null, error: message };
    }
  }, [supabase]);

  // Delete event
  const deleteEvent = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await getEventsTable(supabase)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setEvents(prev => prev.filter(e => e.id !== id));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      return { error: message };
    }
  }, [supabase]);

  // Toggle active status
  const toggleEventActive = useCallback(async (id: string, isActive: boolean) => {
    return updateEvent(id, { is_active: isActive });
  }, [updateEvent]);

  // Reorder events
  const reorderEvents = useCallback(async (orderedIds: string[]) => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        await getEventsTable(supabase)
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      // Refetch to ensure consistency
      await fetchEvents();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder events';
      return { error: message };
    }
  }, [supabase, fetchEvents]);

  // Upload event image
  const uploadEventImage = useCallback(async (file: File): Promise<{ url: string | null; error: string | null }> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sponsors') // Reusing sponsors bucket for now
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sponsors')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      return { url: null, error: message };
    }
  }, [supabase]);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleEventActive,
    reorderEvents,
    uploadEventImage,
  };
}



'use client';

import { useState, useCallback } from 'react';
import type { CalendarEvent, CalendarEventInsert, CalendarEventUpdate } from '@/lib/supabase/types';

export function useEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all events
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/events', { cache: 'no-store' });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error ?? 'Failed to fetch events');
            }
            setEvents((result.data as CalendarEvent[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch events');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Create event
    const createEvent = useCallback(
        async (eventData: CalendarEventInsert) => {
            try {
                const maxOrderIndex = events.reduce(
                    (max, current) => Math.max(max, current.order_index),
                    -1,
                );
                const response = await fetch('/api/admin/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...eventData, order_index: maxOrderIndex + 1 }),
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error ?? 'Failed to create event');
                }

                setEvents((prev) => [...prev, result.data as CalendarEvent]);

                return { data: result.data as CalendarEvent, error: null };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create event';

                return { data: null, error: message };
            }
        },
        [events],
    );

    // Update event
    const updateEvent = useCallback(async (id: string, updates: CalendarEventUpdate) => {
        try {
            const response = await fetch(`/api/admin/events/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error ?? 'Failed to update event');
            }

            setEvents((prev) =>
                prev.map((e) => (e.id === id ? (result.data as CalendarEvent) : e)),
            );

            return { data: result.data as CalendarEvent, error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update event';

            return { data: null, error: message };
        }
    }, []);

    // Delete event
    const deleteEvent = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/admin/events/${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error ?? 'Failed to delete event');
            }

            setEvents((prev) => prev.filter((e) => e.id !== id));

            return { error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete event';

            return { error: message };
        }
    }, []);

    // Toggle active status
    const toggleEventActive = useCallback(
        async (id: string, isActive: boolean) => {
            return updateEvent(id, { is_active: isActive });
        },
        [updateEvent],
    );

    // Reorder events
    const reorderEvents = useCallback(
        async (orderedIds: string[]) => {
            try {
                const updates = orderedIds.map((id, index) => ({
                    id,
                    order_index: index,
                }));

                for (const update of updates) {
                    const response = await fetch(`/api/admin/events/${update.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_index: update.order_index }),
                    });
                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(result.error ?? 'Failed to reorder event');
                    }
                }

                // Refetch to ensure consistency
                await fetchEvents();

                return { error: null };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to reorder events';

                return { error: message };
            }
        },
        [fetchEvents],
    );

    // Upload event image
    const uploadEventImage = useCallback(
        async (file: File): Promise<{ url: string | null; error: string | null }> => {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/admin/events/upload', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error ?? 'Failed to upload image');
                }

                return { url: result.data.url, error: null };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to upload image';

                return { url: null, error: message };
            }
        },
        [],
    );

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

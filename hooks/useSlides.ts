'use client';

import { useState, useCallback } from 'react';
import type { Slide, SlideInsert, SlideUpdate } from '@/lib/supabase/types';

interface UseSlidesReturn {
  slides: Slide[];
  isLoading: boolean;
  error: string | null;
  fetchSlides: () => Promise<void>;
  createSlide: (slide: SlideInsert) => Promise<{ data: Slide | null; error: string | null }>;
  updateSlide: (id: string, updates: SlideUpdate) => Promise<{ error: string | null }>;
  deleteSlide: (id: string) => Promise<{ error: string | null }>;
  duplicateSlide: (slide: Slide) => Promise<{ data: Slide | null; error: string | null }>;
  reorderSlides: (orderedIds: string[]) => Promise<{ error: string | null }>;
  toggleSlideActive: (id: string, isActive: boolean) => Promise<{ error: string | null }>;
}

export function useSlides(): UseSlidesReturn {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all slides
  const fetchSlides = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/slides', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to fetch slides');
      }
      setSlides((result.data as Slide[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch slides';
      setError(message);
      console.error('Error fetching slides:', err);
    } finally {
      setIsLoading(false);
    }
  }, [slides]);

  // Create a new slide
  const createSlide = useCallback(async (slide: SlideInsert) => {
    try {
      const maxOrderIndex = slides.reduce((max, current) => Math.max(max, current.order_index), -1);
      const response = await fetch('/api/admin/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slide, order_index: maxOrderIndex + 1 }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to create slide');
      }

      const newSlide = result.data as Slide;
      // Update local state
      setSlides(prev => [...prev, newSlide]);

      return { data: newSlide, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create slide';
      console.error('Error creating slide:', err);
      return { data: null, error: message };
    }
  }, []);

  // Update a slide
  const updateSlide = useCallback(async (id: string, updates: SlideUpdate) => {
    try {
      // Clean updates - remove undefined values and ensure proper null handling
      const cleanUpdates: Record<string, unknown> = {};
      Object.entries(updates).forEach(([key, value]) => {
        // Only include defined values (not undefined)
        if (value !== undefined) {
          // Convert empty strings to null for optional fields
          if (typeof value === 'string' && value.trim() === '' && key !== 'name' && key !== 'type') {
            cleanUpdates[key] = null;
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      const response = await fetch(`/api/admin/slides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUpdates),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to update slide');
      }
      if (!result.data) {
        console.error('No data returned from update');
        throw new Error('No data returned from update');
      }

      // Update local state with the actual data from database
      setSlides(prev =>
        prev.map(slide =>
          slide.id === id ? (result.data as Slide) : slide
        )
      );

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update slide';
      console.error('Error updating slide:', err);
      return { error: message };
    }
  }, []);

  // Delete a slide
  const deleteSlide = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/slides/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to delete slide');
      }

      // Update local state
      setSlides(prev => prev.filter(slide => slide.id !== id));

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete slide';
      console.error('Error deleting slide:', err);
      return { error: message };
    }
  }, []);

  // Duplicate a slide
  const duplicateSlide = useCallback(async (slide: Slide) => {
    try {
      const maxOrderIndex = slides.reduce((max, current) => Math.max(max, current.order_index), -1);
      const newOrderIndex = maxOrderIndex + 1;

      // Create a copy without id, created_at, updated_at
      const { id: _id, created_at: _created, updated_at: _updated, ...slideData } = slide;

      const newSlide: SlideInsert = {
        ...slideData,
        name: `${slide.name} (copy)`,
        order_index: newOrderIndex,
      };

      const response = await fetch('/api/admin/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlide),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to duplicate slide');
      }

      const duplicatedSlide = result.data as Slide;
      // Update local state
      setSlides(prev => [...prev, duplicatedSlide]);

      return { data: duplicatedSlide, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate slide';
      console.error('Error duplicating slide:', err);
      return { data: null, error: message };
    }
  }, [slides]);

  // Reorder slides by updating order_index
  const reorderSlides = useCallback(async (orderedIds: string[]) => {
    try {
      // Update order_index for each slide
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      // Use Promise.all to update all slides
      const results = await Promise.all(
        updates.map(({ id, order_index }) =>
          fetch(`/api/admin/slides/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index }),
          }).then(async (response) => {
            const result = await response.json();
            return { ok: response.ok, result };
          })
        )
      );

      // Check for errors
      const hasError = results.some(result => !result.ok || !result.result.success);
      if (hasError) {
        throw new Error('Failed to reorder some slides');
      }

      // Update local state
      setSlides(prev => {
        const slideMap = new Map(prev.map(s => [s.id, s]));
        return orderedIds
          .map((id, index) => {
            const slide = slideMap.get(id);
            if (slide) {
              return { ...slide, order_index: index };
            }
            return null;
          })
          .filter((s): s is Slide => s !== null);
      });

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder slides';
      console.error('Error reordering slides:', err);
      return { error: message };
    }
  }, []);

  // Toggle slide active state
  const toggleSlideActive = useCallback(async (id: string, isActive: boolean) => {
    return updateSlide(id, { is_active: isActive });
  }, [updateSlide]);

  return {
    slides,
    isLoading,
    error,
    fetchSlides,
    createSlide,
    updateSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    toggleSlideActive,
  };
}



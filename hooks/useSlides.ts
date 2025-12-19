'use client';

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
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

// Helper to get table with proper typing workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSlidesTable(): any {
  const supabase = getSupabaseClient();
  return supabase.from('slides');
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
      const { data, error: fetchError } = await getSlidesTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setSlides((data as Slide[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch slides';
      setError(message);
      console.error('Error fetching slides:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new slide
  const createSlide = useCallback(async (slide: SlideInsert) => {
    try {
      // Get the highest order_index
      const { data: maxOrderRaw } = await getSlidesTable()
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const maxOrderData = maxOrderRaw as { order_index: number } | null;
      const newOrderIndex = (maxOrderData?.order_index ?? -1) + 1;

      const { data, error: insertError } = await getSlidesTable()
        .insert({ ...slide, order_index: newOrderIndex })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newSlide = data as Slide;
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
      const { error: updateError } = await getSlidesTable()
        .update(updates)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setSlides(prev =>
        prev.map(slide =>
          slide.id === id ? { ...slide, ...updates } : slide
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
      const { error: deleteError } = await getSlidesTable()
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
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
      // Get the highest order_index
      const { data: maxOrderRaw } = await getSlidesTable()
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const maxOrderData = maxOrderRaw as { order_index: number } | null;
      const newOrderIndex = (maxOrderData?.order_index ?? -1) + 1;

      // Create a copy without id, created_at, updated_at
      const { id: _id, created_at: _created, updated_at: _updated, ...slideData } = slide;

      const newSlide: SlideInsert = {
        ...slideData,
        name: `${slide.name} (copy)`,
        order_index: newOrderIndex,
      };

      const { data, error: insertError } = await getSlidesTable()
        .insert(newSlide)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const duplicatedSlide = data as Slide;
      // Update local state
      setSlides(prev => [...prev, duplicatedSlide]);

      return { data: duplicatedSlide, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate slide';
      console.error('Error duplicating slide:', err);
      return { data: null, error: message };
    }
  }, []);

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
          getSlidesTable()
            .update({ order_index })
            .eq('id', id)
        )
      );

      // Check for errors
      const hasError = results.some(result => result.error);
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



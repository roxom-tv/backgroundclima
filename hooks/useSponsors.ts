'use client';

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Sponsor, SponsorInsert, SponsorUpdate } from '@/lib/supabase/types';

interface UseSponsorsReturn {
  sponsors: Sponsor[];
  isLoading: boolean;
  error: string | null;
  fetchSponsors: () => Promise<void>;
  createSponsor: (sponsor: SponsorInsert) => Promise<{ data: Sponsor | null; error: string | null }>;
  updateSponsor: (id: string, updates: SponsorUpdate) => Promise<{ error: string | null }>;
  deleteSponsor: (id: string) => Promise<{ error: string | null }>;
  reorderSponsors: (orderedIds: string[]) => Promise<{ error: string | null }>;
  toggleSponsorActive: (id: string, isActive: boolean) => Promise<{ error: string | null }>;
}

// Helper to get table with proper typing workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSponsorsTable(): any {
  const supabase = getSupabaseClient();
  return supabase.from('sponsors');
}

export function useSponsors(): UseSponsorsReturn {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sponsors
  const fetchSponsors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getSponsorsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setSponsors((data as Sponsor[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sponsors';
      setError(message);
      console.error('Error fetching sponsors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new sponsor
  const createSponsor = useCallback(async (sponsor: SponsorInsert) => {
    try {
      // Get the highest order_index
      const { data: maxOrderRaw } = await getSponsorsTable()
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const maxOrderData = maxOrderRaw as { order_index: number } | null;
      const newOrderIndex = (maxOrderData?.order_index ?? -1) + 1;

      const { data, error: insertError } = await getSponsorsTable()
        .insert({ ...sponsor, order_index: newOrderIndex })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newSponsor = data as Sponsor;
      // Update local state
      setSponsors(prev => [...prev, newSponsor]);

      return { data: newSponsor, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create sponsor';
      console.error('Error creating sponsor:', err);
      return { data: null, error: message };
    }
  }, []);

  // Update a sponsor
  const updateSponsor = useCallback(async (id: string, updates: SponsorUpdate) => {
    try {
      const { error: updateError } = await getSponsorsTable()
        .update(updates)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setSponsors(prev =>
        prev.map(sponsor =>
          sponsor.id === id ? { ...sponsor, ...updates } : sponsor
        )
      );

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update sponsor';
      console.error('Error updating sponsor:', err);
      return { error: message };
    }
  }, []);

  // Delete a sponsor
  const deleteSponsor = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await getSponsorsTable()
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setSponsors(prev => prev.filter(sponsor => sponsor.id !== id));

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete sponsor';
      console.error('Error deleting sponsor:', err);
      return { error: message };
    }
  }, []);

  // Reorder sponsors
  const reorderSponsors = useCallback(async (orderedIds: string[]) => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      const results = await Promise.all(
        updates.map(({ id, order_index }) =>
          getSponsorsTable()
            .update({ order_index })
            .eq('id', id)
        )
      );

      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to reorder some sponsors');
      }

      // Update local state
      setSponsors(prev => {
        const sponsorMap = new Map(prev.map(s => [s.id, s]));
        return orderedIds
          .map((id, index) => {
            const sponsor = sponsorMap.get(id);
            if (sponsor) {
              return { ...sponsor, order_index: index };
            }
            return null;
          })
          .filter((s): s is Sponsor => s !== null);
      });

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder sponsors';
      console.error('Error reordering sponsors:', err);
      return { error: message };
    }
  }, []);

  // Toggle sponsor active state
  const toggleSponsorActive = useCallback(async (id: string, isActive: boolean) => {
    return updateSponsor(id, { is_active: isActive });
  }, [updateSponsor]);

  return {
    sponsors,
    isLoading,
    error,
    fetchSponsors,
    createSponsor,
    updateSponsor,
    deleteSponsor,
    reorderSponsors,
    toggleSponsorActive,
  };
}



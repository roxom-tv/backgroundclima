'use client';

import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSponsors } from '@/hooks/useSponsors';
import SponsorForm from '../components/SponsorForm';
import type { Sponsor, SponsorInsert } from '@/lib/supabase/types';

export default function SponsorsPage() {
  const {
    sponsors,
    isLoading,
    error,
    fetchSponsors,
    createSponsor,
    updateSponsor,
    deleteSponsor,
    reorderSponsors,
    toggleSponsorActive,
  } = useSponsors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch sponsors on mount
  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  // Show notification
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const newSponsors = Array.from(sponsors);
    const [removed] = newSponsors.splice(sourceIndex, 1);
    newSponsors.splice(destIndex, 0, removed);

    const orderedIds = newSponsors.map(s => s.id);

    const { error } = await reorderSponsors(orderedIds);
    
    if (error) {
      showNotification('error', 'Failed to reorder sponsors');
      fetchSponsors();
    } else {
      showNotification('success', 'Sponsors reordered successfully');
    }
  }, [sponsors, reorderSponsors, fetchSponsors, showNotification]);

  // Handle form submit
  const handleFormSubmit = useCallback(async (data: SponsorInsert) => {
    setIsSubmitting(true);

    try {
      if (editingSponsor) {
        const { error } = await updateSponsor(editingSponsor.id, data);
        if (error) {
          showNotification('error', error);
        } else {
          showNotification('success', 'Sponsor updated successfully');
          setIsFormOpen(false);
          setEditingSponsor(null);
          fetchSponsors();
        }
      } else {
        const { error } = await createSponsor(data);
        if (error) {
          showNotification('error', error);
        } else {
          showNotification('success', 'Sponsor added successfully');
          setIsFormOpen(false);
          fetchSponsors();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [editingSponsor, createSponsor, updateSponsor, fetchSponsors, showNotification]);

  // Handle edit
  const handleEdit = useCallback((sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsFormOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(async (sponsor: Sponsor) => {
    if (window.confirm(`Are you sure you want to delete "${sponsor.name}"?`)) {
      const { error } = await deleteSponsor(sponsor.id);
      if (error) {
        showNotification('error', error);
      } else {
        showNotification('success', 'Sponsor deleted successfully');
      }
    }
  }, [deleteSponsor, showNotification]);

  // Handle toggle active
  const handleToggleActive = useCallback(async (sponsor: Sponsor) => {
    const { error } = await toggleSponsorActive(sponsor.id, !sponsor.is_active);
    if (error) {
      showNotification('error', error);
    } else {
      showNotification('success', `Sponsor ${!sponsor.is_active ? 'activated' : 'deactivated'}`);
    }
  }, [toggleSponsorActive, showNotification]);

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setEditingSponsor(null);
  }, []);

  // Handle add new
  const handleAddNew = useCallback(() => {
    setEditingSponsor(null);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#00ff00] pb-3 mb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">SPONSORS</h1>
          <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
            MANAGE SPONSORS DISPLAYED ON THE &quot;PRESENTED BY&quot; SECTION
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-[#00ff00] hover:bg-[#00cc00] text-black px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border-2 border-[#00ff00]"
        >
          <span>+</span>
          <span>ADD SPONSOR</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 text-xs font-mono border-2 ${
            notification.type === 'success'
              ? 'bg-[#0a0a0a] border-[#00ff00] text-[#00ff00]'
              : 'bg-[#0a0a0a] border-[#ff0000] text-[#ff0000]'
          }`}
        >
          {notification.message.toUpperCase()}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-[#0a0a0a] border-2 border-[#ff0000] text-[#ff0000] p-3 text-xs font-mono">
          {error.toUpperCase()}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !sponsors.length && (
        <div className="text-center py-12">
          <div className="text-gray-400 animate-pulse">Loading sponsors...</div>
        </div>
      )}

      {/* Sponsors List */}
      {!isLoading && sponsors.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-medium text-white mb-2">No sponsors yet</h3>
          <p className="text-gray-400 mb-4">
            Add sponsors to display in the &quot;Presented by&quot; section
          </p>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Add First Sponsor
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sponsors">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {sponsors.map((sponsor, index) => (
                  <Draggable key={sponsor.id} draggableId={sponsor.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-[#0a0a0a] border-2 p-4 transition-all ${
                          snapshot.isDragging
                            ? 'border-[#00ff00] bg-[#1a1a1a]'
                            : sponsor.is_active
                            ? 'border-[#00ff00]'
                            : 'border-[#333] opacity-60'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 mb-3"
                        >
                          <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                          </svg>
                        </div>

                        {/* Logo */}
                        <div className="h-16 flex items-center justify-center bg-black rounded mb-3">
                          {sponsor.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={sponsor.logo_url}
                              alt={sponsor.name}
                              className="max-h-12 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {sponsor.name}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="text-white font-medium text-center mb-3">
                          {sponsor.name}
                        </h3>

                        {/* Actions */}
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(sponsor)}
                            className={`p-2 rounded transition-colors ${
                              sponsor.is_active
                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                            title={sponsor.is_active ? 'Active' : 'Inactive'}
                          >
                            {sponsor.is_active ? '✓' : '○'}
                          </button>
                          <button
                            onClick={() => handleEdit(sponsor)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(sponsor)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Info */}
      {sponsors.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">
            💡 The first active sponsor will be displayed on the screen. 
            Drag to reorder sponsors.
          </p>
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a0a0a] w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-[#00ff00]">
            <div className="p-4 border-b-2 border-[#00ff00]">
              <h2 className="text-lg font-mono font-semibold text-white uppercase tracking-wider">
                {editingSponsor ? 'EDIT SPONSOR' : 'ADD NEW SPONSOR'}
              </h2>
            </div>
            <div className="p-6">
              <SponsorForm
                sponsor={editingSponsor}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



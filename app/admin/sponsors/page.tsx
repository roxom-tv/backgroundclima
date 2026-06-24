'use client';

import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSponsors } from '@/hooks/useSponsors';
import SponsorForm from '../components/SponsorForm';
import {
    PageHeader,
    Notification,
    EmptyState,
    LoadingState,
    Modal,
    InfoBox,
} from '../components/ui';
import type { Sponsor, SponsorInsert } from '@/lib/types/admin';

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
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        fetchSponsors();
    }, [fetchSponsors]);

    const showNotification = useCallback((type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const handleDragEnd = useCallback(
        async (result: DropResult) => {
            if (!result.destination) {
                return;
            }

            const sourceIndex = result.source.index;
            const destIndex = result.destination.index;

            if (sourceIndex === destIndex) {
                return;
            }

            const newSponsors = Array.from(sponsors);
            const [removed] = newSponsors.splice(sourceIndex, 1);
            newSponsors.splice(destIndex, 0, removed);

            const orderedIds = newSponsors.map((s) => s.id);

            const { error } = await reorderSponsors(orderedIds);

            if (error) {
                showNotification('error', 'Failed to reorder sponsors');
                fetchSponsors();
            } else {
                showNotification('success', 'Order updated');
            }
        },
        [sponsors, reorderSponsors, fetchSponsors, showNotification],
    );

    const handleFormSubmit = useCallback(
        async (data: SponsorInsert) => {
            setIsSubmitting(true);

            try {
                if (editingSponsor) {
                    const { error } = await updateSponsor(editingSponsor.id, data);

                    if (error) {
                        showNotification('error', error);
                    } else {
                        showNotification('success', 'Sponsor updated');
                        setIsFormOpen(false);
                        setEditingSponsor(null);
                        fetchSponsors();
                    }
                } else {
                    const { error } = await createSponsor(data);

                    if (error) {
                        showNotification('error', error);
                    } else {
                        showNotification('success', 'Sponsor added');
                        setIsFormOpen(false);
                        fetchSponsors();
                    }
                }
            } finally {
                setIsSubmitting(false);
            }
        },
        [editingSponsor, createSponsor, updateSponsor, fetchSponsors, showNotification],
    );

    const handleEdit = useCallback((sponsor: Sponsor) => {
        setEditingSponsor(sponsor);
        setIsFormOpen(true);
    }, []);

    const handleDelete = useCallback(
        async (sponsor: Sponsor) => {
            if (window.confirm(`Delete "${sponsor.name}"?`)) {
                const { error } = await deleteSponsor(sponsor.id);

                if (error) {
                    showNotification('error', error);
                } else {
                    showNotification('success', 'Sponsor deleted');
                }
            }
        },
        [deleteSponsor, showNotification],
    );

    const handleToggleActive = useCallback(
        async (sponsor: Sponsor) => {
            const { error } = await toggleSponsorActive(sponsor.id, !sponsor.is_active);

            if (error) {
                showNotification('error', error);
            }
        },
        [toggleSponsorActive, showNotification],
    );

    const handleFormCancel = useCallback(() => {
        setIsFormOpen(false);
        setEditingSponsor(null);
    }, []);

    const handleAddNew = useCallback(() => {
        setEditingSponsor(null);
        setIsFormOpen(true);
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                title="SPONSORS"
                subtitle='MANAGE SPONSORS DISPLAYED ON THE "PRESENTED BY" SECTION'
                action={
                    <button
                        onClick={handleAddNew}
                        className="admin-btn-primary flex items-center gap-2"
                    >
                        <span className="text-lg">+</span>
                        <span>ADD SPONSOR</span>
                    </button>
                }
            />

            {notification && (
                <Notification type={notification.type} message={notification.message} />
            )}

            {error && <div className="admin-notification error">{error.toUpperCase()}</div>}

            {isLoading && !sponsors.length && <LoadingState />}

            {!isLoading && sponsors.length === 0 ? (
                <EmptyState
                    icon="💼"
                    title="NO SPONSORS YET"
                    description='Add sponsors to display in the "Presented by" section'
                    action={{ label: 'ADD FIRST SPONSOR', onClick: handleAddNew }}
                />
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
                                    <Draggable
                                        key={sponsor.id}
                                        draggableId={sponsor.id}
                                        index={index}
                                    >
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
                                                    className="cursor-grab active:cursor-grabbing text-[#666] hover:text-[#888] mb-3"
                                                >
                                                    <svg
                                                        className="w-5 h-5 mx-auto"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                                                    </svg>
                                                </div>

                                                {/* Logo */}
                                                <div className="h-16 flex items-center justify-center bg-black mb-3">
                                                    {sponsor.logo_url ? (
                                                        <img
                                                            src={sponsor.logo_url}
                                                            alt={sponsor.name}
                                                            className="max-h-12 max-w-full object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-white font-mono font-bold text-sm uppercase tracking-wider">
                                                            {sponsor.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Name */}
                                                <h3 className="text-white font-mono font-medium text-xs text-center mb-3 uppercase tracking-wider">
                                                    {sponsor.name}
                                                </h3>

                                                {/* Actions */}
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleActive(sponsor)}
                                                        className={`p-2 border-2 transition-colors font-mono text-xs ${
                                                            sponsor.is_active
                                                                ? 'bg-[#00ff00] text-black border-[#00ff00] hover:bg-[#00cc00]'
                                                                : 'bg-[#1a1a1a] text-[#888] border-[#333] hover:bg-[#2a2a2a]'
                                                        }`}
                                                        title={
                                                            sponsor.is_active
                                                                ? 'Active'
                                                                : 'Inactive'
                                                        }
                                                    >
                                                        {sponsor.is_active ? '✓' : '○'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(sponsor)}
                                                        className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-2 border-[#333] transition-colors font-mono text-xs"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sponsor)}
                                                        className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff0000] border-2 border-[#ff0000] transition-colors font-mono text-xs"
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

            {sponsors.length > 0 && (
                <InfoBox icon="💡">
                    The first active sponsor will be displayed on the screen. Drag to reorder
                    sponsors.
                </InfoBox>
            )}

            <Modal
                isOpen={isFormOpen}
                onClose={handleFormCancel}
                title={editingSponsor ? 'EDIT SPONSOR' : 'ADD NEW SPONSOR'}
                maxWidth="md"
            >
                <SponsorForm
                    sponsor={editingSponsor}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                    isSubmitting={isSubmitting}
                />
            </Modal>
        </div>
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useEvents } from '@/hooks/useEvents';
import EventForm from '../components/EventForm';
import type { CalendarEvent, CalendarEventInsert } from '@/lib/supabase/types';

export default function EventsPage() {
    const {
        events,
        isLoading,
        error,
        fetchEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        reorderEvents,
        toggleEventActive,
        uploadEventImage,
    } = useEvents();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'upcoming' | 'past'>(
        'all',
    );

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const showNotification = useCallback((type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Filter events
    const today = new Date().toISOString().split('T')[0];
    const filteredEvents = events.filter((event) => {
        if (filter === 'active') {
            return event.is_active;
        }
        if (filter === 'inactive') {
            return !event.is_active;
        }
        if (filter === 'upcoming') {
            return event.start_date >= today;
        }
        if (filter === 'past') {
            return event.start_date < today;
        }

        return true;
    });

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

            const newEvents = Array.from(events);
            const [removed] = newEvents.splice(sourceIndex, 1);
            newEvents.splice(destIndex, 0, removed);

            const orderedIds = newEvents.map((e) => e.id);

            const { error } = await reorderEvents(orderedIds);

            if (error) {
                showNotification('error', 'Failed to reorder events');
                fetchEvents();
            } else {
                showNotification('success', 'Order updated');
            }
        },
        [events, reorderEvents, fetchEvents, showNotification],
    );

    const handleFormSubmit = useCallback(
        async (data: CalendarEventInsert) => {
            setIsSubmitting(true);

            try {
                if (editingEvent) {
                    const { error } = await updateEvent(editingEvent.id, data);

                    if (error) {
                        showNotification('error', error);
                    } else {
                        showNotification('success', 'Event updated');
                        setIsFormOpen(false);
                        setEditingEvent(null);
                        fetchEvents();
                    }
                } else {
                    const { error } = await createEvent(data);

                    if (error) {
                        showNotification('error', error);
                    } else {
                        showNotification('success', 'Event created');
                        setIsFormOpen(false);
                        fetchEvents();
                    }
                }
            } finally {
                setIsSubmitting(false);
            }
        },
        [editingEvent, createEvent, updateEvent, fetchEvents, showNotification],
    );

    const handleEdit = useCallback((event: CalendarEvent) => {
        setEditingEvent(event);
        setIsFormOpen(true);
    }, []);

    const handleDelete = useCallback(
        async (event: CalendarEvent) => {
            if (window.confirm(`Delete "${event.title}"?`)) {
                const { error } = await deleteEvent(event.id);

                if (error) {
                    showNotification('error', error);
                } else {
                    showNotification('success', 'Event deleted');
                }
            }
        },
        [deleteEvent, showNotification],
    );

    const handleToggleActive = useCallback(
        async (event: CalendarEvent) => {
            const { error } = await toggleEventActive(event.id, !event.is_active);

            if (error) {
                showNotification('error', error);
            }
        },
        [toggleEventActive, showNotification],
    );

    const handleFormCancel = useCallback(() => {
        setIsFormOpen(false);
        setEditingEvent(null);
    }, []);

    const handleAddNew = useCallback(() => {
        setEditingEvent(null);
        setIsFormOpen(true);
    }, []);

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (timeStr: string | null) => {
        if (!timeStr) {
            return '';
        }
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;

        return `${hour12}:${minutes} ${ampm}`;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 pb-4">
                <div className="flex items-center justify-between mb-4 border-b-2 border-[#00ff00] pb-3">
                    <div>
                        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">
                            CALENDAR EVENTS
                        </h1>
                        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                            MANAGE EVENTS DISPLAYED ON THE CALENDAR SLIDE
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-[#00ff00] hover:bg-[#00cc00] text-black px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border-2 border-[#00ff00]"
                    >
                        <span className="text-lg">+</span>
                        <span>ADD EVENT</span>
                    </button>
                </div>

                {/* Stats & Filter */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] p-3 border-2 border-[#00ff00]">
                    <div className="flex gap-4 text-xs font-mono">
                        <span className="text-[#888]">
                            TOTAL: <span className="text-white font-bold">{events.length}</span>
                        </span>
                        <span className="text-[#888]">
                            ACTIVE:{' '}
                            <span className="text-[#00ff00] font-bold">
                                {events.filter((e) => e.is_active).length}
                            </span>
                        </span>
                        <span className="text-[#888]">
                            UPCOMING:{' '}
                            <span className="text-[#00ff00] font-bold">
                                {events.filter((e) => e.start_date >= today).length}
                            </span>
                        </span>
                    </div>
                    <div className="flex gap-0 flex-wrap">
                        {(['all', 'active', 'inactive', 'upcoming', 'past'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors border-r-2 border-[#1a1a1a] last:border-r-0 ${
                                    filter === f
                                        ? 'bg-[#00ff00] text-black'
                                        : 'bg-[#0a0a0a] text-[#00ff00] hover:bg-[#1a1a1a]'
                                }`}
                            >
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div
                        className={`mt-4 p-3 text-xs font-mono border-2 ${
                            notification.type === 'success'
                                ? 'bg-[#0a0a0a] border-[#00ff00] text-[#00ff00]'
                                : 'bg-[#0a0a0a] border-[#ff0000] text-[#ff0000]'
                        }`}
                    >
                        {notification.message.toUpperCase()}
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-[#0a0a0a] border-2 border-[#ff0000] text-[#ff0000] p-3 text-xs font-mono">
                        {error.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading && !events.length ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 animate-pulse">Loading events...</div>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-medium text-white mb-2">
                            {filter !== 'all' ? `No ${filter} events` : 'No events yet'}
                        </h3>
                        <p className="text-gray-400 mb-4">
                            {filter !== 'all'
                                ? 'Try changing the filter'
                                : 'Add your first event to get started'}
                        </p>
                        {filter === 'all' && (
                            <button
                                onClick={handleAddNew}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                            >
                                Add First Event
                            </button>
                        )}
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="events">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-2 pb-4"
                                >
                                    {filteredEvents.map((event, index) => {
                                        const isPast = event.start_date < today;

                                        return (
                                            <Draggable
                                                key={event.id}
                                                draggableId={event.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-[#0a0a0a] border-2 transition-all ${
                                                            snapshot.isDragging
                                                                ? 'border-[#00ff00] bg-[#1a1a1a]'
                                                                : event.is_active
                                                                  ? 'border-[#00ff00] hover:border-[#00cc00]'
                                                                  : 'border-[#333] opacity-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center p-3 gap-3">
                                                            {/* Drag Handle */}
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                                                                </svg>
                                                            </div>

                                                            {/* Color indicator */}
                                                            <div
                                                                className="w-3 h-12 rounded-full flex-shrink-0"
                                                                style={{
                                                                    backgroundColor: event.color,
                                                                }}
                                                            />

                                                            {/* Event image */}
                                                            {event.image_url && (
                                                                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-700">
                                                                    <Image
                                                                        src={event.image_url}
                                                                        alt={event.title}
                                                                        width={64}
                                                                        height={48}
                                                                        unoptimized
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white font-medium truncate">
                                                                        {event.title}
                                                                    </span>
                                                                    {isPast && (
                                                                        <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                                                                            Past
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                                    <span className="text-gray-400">
                                                                        📅{' '}
                                                                        {formatDate(
                                                                            event.start_date,
                                                                        )}
                                                                        {event.end_date &&
                                                                            ` - ${formatDate(event.end_date)}`}
                                                                    </span>
                                                                    {event.start_time && (
                                                                        <span className="text-gray-400">
                                                                            🕐{' '}
                                                                            {formatTime(
                                                                                event.start_time,
                                                                            )}
                                                                            {event.end_time &&
                                                                                ` - ${formatTime(event.end_time)}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {event.description && (
                                                                    <p className="text-xs text-gray-500 truncate mt-1 max-w-md">
                                                                        {event.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() =>
                                                                        handleToggleActive(event)
                                                                    }
                                                                    className={`p-2 rounded transition-colors ${
                                                                        event.is_active
                                                                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                                    }`}
                                                                    title={
                                                                        event.is_active
                                                                            ? 'Active - Click to disable'
                                                                            : 'Inactive - Click to enable'
                                                                    }
                                                                >
                                                                    {event.is_active ? '✓' : '○'}
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleEdit(event)
                                                                    }
                                                                    className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(event)
                                                                    }
                                                                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0a0a0a] w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-[#00ff00]">
                        <div className="sticky top-0 bg-[#0a0a0a] p-4 border-b-2 border-[#00ff00] flex items-center justify-between">
                            <h2 className="text-lg font-mono font-semibold text-white uppercase tracking-wider">
                                {editingEvent
                                    ? `EDIT: ${editingEvent.title.toUpperCase()}`
                                    : 'ADD NEW EVENT'}
                            </h2>
                            <button
                                onClick={handleFormCancel}
                                className="text-[#00ff00] hover:text-white text-2xl font-mono"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <EventForm
                                event={editingEvent}
                                onSubmit={handleFormSubmit}
                                onCancel={handleFormCancel}
                                onUploadImage={uploadEventImage}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

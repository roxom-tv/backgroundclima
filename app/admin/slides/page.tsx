'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSlides } from '@/hooks/useSlides';
import SlideForm from '../components/SlideForm';
import type { Slide, SlideInsert } from '@/lib/types/admin';
import { isSlideScheduledNow, hasSchedule, formatScheduleSummary } from '@/lib/schedule-utils';

export default function SlidesPage() {
    const {
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
    } = useSlides();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Debt slide mini-form state
    const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
    const [editingDebtSlide, setEditingDebtSlide] = useState<Slide | null>(null);
    const [debtDuration, setDebtDuration] = useState(35);
    const [debtActiveDays, setDebtActiveDays] = useState<number[] | null>(null);
    const [debtTimeStart, setDebtTimeStart] = useState<string | null>(null);
    const [debtTimeEnd, setDebtTimeEnd] = useState<string | null>(null);

    // UTC clock — refreshed every 60 s so schedule status updates automatically
    const [nowUtc, setNowUtc] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNowUtc(new Date()), 60_000);

        return () => clearInterval(id);
    }, []);

    // Pre-compute per-slide schedule status (memoised, updates every minute)
    const slideScheduleStatus = useMemo(
        () =>
            new Map(
                slides.map((s) => [
                    s.id,
                    {
                        hasSchedule: hasSchedule(s),
                        isActive: isSlideScheduledNow(s, nowUtc),
                        summary: formatScheduleSummary(s),
                    },
                ]),
            ),
        [slides, nowUtc],
    );

    // Fetch slides on mount
    useEffect(() => {
        fetchSlides();
    }, [fetchSlides]);

    // Show notification
    const showNotification = useCallback((type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Filter slides
    const filteredSlides = slides.filter((slide) => {
        if (filter === 'active') {
            return slide.is_active;
        }
        if (filter === 'inactive') {
            return !slide.is_active;
        }

        return true;
    });

    // Handle drag end
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

            // If filter is active, we need to work with filtered slides
            // and then reconstruct the full order
            if (filter !== 'all') {
                // Get the dragged slide from filtered list
                const draggedSlide = filteredSlides[sourceIndex];

                // Create new filtered order
                const newFilteredSlides = Array.from(filteredSlides);
                newFilteredSlides.splice(sourceIndex, 1);
                newFilteredSlides.splice(destIndex, 0, draggedSlide);

                // Merge back with non-filtered slides, maintaining relative order
                const otherSlides = slides.filter((s) => !filteredSlides.includes(s));

                // Combine: put filtered slides in their new order, then others
                const allReordered = [...newFilteredSlides, ...otherSlides];
                const orderedIds = allReordered.map((s) => s.id);

                const { error } = await reorderSlides(orderedIds);

                if (error) {
                    showNotification('error', 'Failed to reorder slides');
                    fetchSlides();
                } else {
                    showNotification('success', 'Order updated');
                }
            } else {
                // No filter - simple reorder of all slides
                const newSlides = Array.from(slides);
                const [removed] = newSlides.splice(sourceIndex, 1);
                newSlides.splice(destIndex, 0, removed);

                const orderedIds = newSlides.map((s) => s.id);

                const { error } = await reorderSlides(orderedIds);

                if (error) {
                    showNotification('error', 'Failed to reorder slides');
                    fetchSlides();
                } else {
                    showNotification('success', 'Order updated');
                }
            }
        },
        [slides, filteredSlides, filter, reorderSlides, fetchSlides, showNotification],
    );

    // Handle form submit
    const handleFormSubmit = useCallback(
        async (data: SlideInsert) => {
            setIsSubmitting(true);

            try {
                if (editingSlide) {
                    // Convert SlideInsert to SlideUpdate (remove fields that shouldn't be updated on edit)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { order_index, ...updateData } = data;

                    const { error } = await updateSlide(editingSlide.id, updateData);

                    if (error) {
                        console.error('Update error:', error);
                        showNotification('error', `Failed to update: ${error}`);
                    } else {
                        showNotification('success', 'Slide updated successfully');
                        setIsFormOpen(false);
                        setEditingSlide(null);
                        // Refresh immediately to show updated data
                        await fetchSlides();
                    }
                } else {
                    const { error } = await createSlide(data);

                    if (error) {
                        console.error('Create error:', error);
                        showNotification('error', error);
                    } else {
                        showNotification('success', 'Slide created successfully');
                        setIsFormOpen(false);
                        await fetchSlides();
                    }
                }
            } catch (err) {
                console.error('Form submit error:', err);
                showNotification('error', err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsSubmitting(false);
            }
        },
        [editingSlide, createSlide, updateSlide, fetchSlides, showNotification],
    );

    // Handle edit
    const handleEdit = useCallback((slide: Slide) => {
        setEditingSlide(slide);
        setIsFormOpen(true);
    }, []);

    // Handle delete
    const handleDelete = useCallback(
        async (slide: Slide) => {
            if (window.confirm(`Delete "${slide.name}"?`)) {
                const { error } = await deleteSlide(slide.id);

                if (error) {
                    showNotification('error', error);
                } else {
                    showNotification('success', 'Slide deleted successfully');
                    // Refresh slides list after deletion
                    await fetchSlides();
                }
            }
        },
        [deleteSlide, fetchSlides, showNotification],
    );

    // Handle duplicate
    const handleDuplicate = useCallback(
        async (slide: Slide) => {
            const { error } = await duplicateSlide(slide);

            if (error) {
                showNotification('error', error);
            } else {
                showNotification('success', `Duplicated "${slide.name}"`);
                fetchSlides();
            }
        },
        [duplicateSlide, fetchSlides, showNotification],
    );

    // Handle toggle active
    const handleToggleActive = useCallback(
        async (slide: Slide) => {
            const { error } = await toggleSlideActive(slide.id, !slide.is_active);

            if (error) {
                showNotification('error', error);
            }
        },
        [toggleSlideActive, showNotification],
    );

    // Handle form cancel
    const handleFormCancel = useCallback(() => {
        setIsFormOpen(false);
        setEditingSlide(null);
    }, []);

    // Handle add new
    const handleAddNew = useCallback(() => {
        setEditingSlide(null);
        setIsFormOpen(true);
    }, []);

    // Get type info
    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'youtube':
                return { icon: '📺', label: 'YouTube', color: 'text-red-400' };
            case 'debt':
                return { icon: '💵', label: 'US Debt', color: 'text-yellow-400' };
            case 'metals':
                return { icon: '🥇', label: 'Metals', color: 'text-amber-400' };
            case 'fx':
                return { icon: '💱', label: 'FX', color: 'text-cyan-400' };
            case 'show':
                return { icon: '🎬', label: 'Show', color: 'text-green-400' };
            case 'event':
                return { icon: '📅', label: 'Event', color: 'text-purple-400' };
            case 'calendar':
                return { icon: '📅', label: 'Calendar', color: 'text-blue-400' };
            case 'news':
                return { icon: '📰', label: 'News', color: 'text-orange-400' };
            case 'video':
                return { icon: '🎥', label: 'Video', color: 'text-pink-400' };
            case 'strc':
                return { icon: '📊', label: 'STRC', color: 'text-sky-400' };
            case 'sata':
                return { icon: '🛰️', label: 'SATA', color: 'text-indigo-400' };
            default:
                return { icon: '📄', label: 'Unknown', color: 'text-gray-400' };
        }
    };

    // Check if slide is a system slide (hardcoded content, limited editing)
    const isSystemSlide = (type: string) => ['debt', 'metals', 'fx', 'strc', 'sata'].includes(type);

    // Handle edit debt slide (open mini-form)
    const handleEditDebt = useCallback((slide: Slide) => {
        setEditingDebtSlide(slide);
        setDebtDuration(slide.duration_seconds);
        setDebtActiveDays(slide.active_days ?? null);
        setDebtTimeStart(slide.active_time_start ?? null);
        setDebtTimeEnd(slide.active_time_end ?? null);
        setIsDebtFormOpen(true);
    }, []);

    // Handle save debt slide settings
    const handleSaveDebt = useCallback(async () => {
        if (!editingDebtSlide) {
            return;
        }

        setIsSubmitting(true);
        const { error } = await updateSlide(editingDebtSlide.id, {
            duration_seconds: debtDuration,
            is_active: editingDebtSlide.is_active,
            show_sponsor: editingDebtSlide.show_sponsor,
            active_days: debtActiveDays && debtActiveDays.length > 0 ? debtActiveDays : null,
            active_time_start: debtTimeStart || null,
            active_time_end: debtTimeEnd || null,
        });

        if (error) {
            showNotification('error', error);
        } else {
            showNotification('success', 'Slide updated');
            setIsDebtFormOpen(false);
            fetchSlides();
        }
        setIsSubmitting(false);
    }, [
        editingDebtSlide,
        debtDuration,
        debtActiveDays,
        debtTimeStart,
        debtTimeEnd,
        updateSlide,
        showNotification,
        fetchSlides,
    ]);

    // Format date for display
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) {
            return '';
        }
        const date = new Date(dateStr + 'T00:00:00');

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 pb-4">
                <div className="flex items-center justify-between mb-4 border-b-2 border-[#00ff00] pb-3">
                    <div>
                        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">
                            SLIDES
                        </h1>
                        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                            DRAG TO REORDER • CLICK TO EDIT
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-[#00ff00] hover:bg-[#00cc00] text-black px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border-2 border-[#00ff00]"
                    >
                        <span className="text-lg">+</span>
                        <span>ADD SLIDE</span>
                    </button>
                </div>

                {/* Stats & Filter */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0a0a] p-3 border-2 border-[#00ff00]">
                    <div className="flex gap-4 text-xs font-mono">
                        <span className="text-[#888]">
                            TOTAL: <span className="text-white font-bold">{slides.length}</span>
                        </span>
                        <span className="text-[#888]">
                            ACTIVE:{' '}
                            <span className="text-[#00ff00] font-bold">
                                {slides.filter((s) => s.is_active).length}
                            </span>
                        </span>
                        <span className="text-[#888]">
                            DURATION:{' '}
                            <span className="text-white font-bold">
                                {Math.floor(
                                    slides
                                        .filter((s) => s.is_active)
                                        .reduce((acc, s) => acc + s.duration_seconds, 0) / 60,
                                )}
                                m{' '}
                                {slides
                                    .filter((s) => s.is_active)
                                    .reduce((acc, s) => acc + s.duration_seconds, 0) % 60}
                                s
                            </span>
                        </span>
                    </div>
                    <div className="flex gap-0">
                        {(['all', 'active', 'inactive'] as const).map((f) => (
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

            {/* Scrollable Slides List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading && !slides.length ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 animate-pulse">Loading slides...</div>
                    </div>
                ) : filteredSlides.length === 0 ? (
                    <div className="text-center py-12 bg-[#0a0a0a] border-2 border-[#00ff00]">
                        <div className="text-4xl mb-4 opacity-50">🎬</div>
                        <h3 className="text-lg font-mono font-medium text-white mb-2 uppercase tracking-wider">
                            {filter !== 'all'
                                ? `NO ${filter.toUpperCase()} SLIDES`
                                : 'NO SLIDES YET'}
                        </h3>
                        <p className="text-[#888] mb-4 text-xs font-mono uppercase tracking-wider">
                            {filter !== 'all'
                                ? 'TRY CHANGING THE FILTER'
                                : 'ADD YOUR FIRST SLIDE TO GET STARTED'}
                        </p>
                        {filter === 'all' && (
                            <button
                                onClick={handleAddNew}
                                className="bg-[#00ff00] hover:bg-[#00cc00] text-black px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors border-2 border-[#00ff00]"
                            >
                                ADD FIRST SLIDE
                            </button>
                        )}
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="slides">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-2 pb-4"
                                >
                                    {filteredSlides.map((slide, index) => {
                                        const typeInfo = getTypeInfo(slide.type);
                                        const sched = slideScheduleStatus.get(slide.id);
                                        const schedOff = sched?.hasSchedule && !sched?.isActive;

                                        return (
                                            <Draggable
                                                key={slide.id}
                                                draggableId={slide.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-gray-800 rounded-lg border transition-all ${
                                                            snapshot.isDragging
                                                                ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                                                                : !slide.is_active
                                                                  ? 'border-gray-700/50 opacity-50'
                                                                  : schedOff
                                                                    ? 'border-yellow-700/60 opacity-50'
                                                                    : 'border-gray-700 hover:border-gray-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center p-3 gap-3">
                                                            {/* Drag Handle + Position */}
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
                                                                <span className="text-xs font-mono w-6 text-center">
                                                                    {index + 1}
                                                                </span>
                                                            </div>

                                                            {/* Type Icon */}
                                                            <span
                                                                className="text-xl"
                                                                title={typeInfo.label}
                                                            >
                                                                {typeInfo.icon}
                                                            </span>

                                                            {/* Image thumbnail for event/show/news */}
                                                            {(slide.type === 'event' ||
                                                                slide.type === 'show' ||
                                                                slide.type === 'news') &&
                                                                slide.image_url && (
                                                                    <div className="w-16 h-10 overflow-hidden flex-shrink-0 bg-[#1a1a1a] border-2 border-[#00ff00]">
                                                                        <Image
                                                                            src={slide.image_url}
                                                                            alt={slide.name}
                                                                            width={64}
                                                                            height={40}
                                                                            unoptimized
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                )}

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white font-medium truncate">
                                                                        {slide.name}
                                                                    </span>
                                                                    {slide.country && (
                                                                        <span className="text-gray-500 text-sm truncate">
                                                                            ({slide.country})
                                                                        </span>
                                                                    )}
                                                                    {isSystemSlide(slide.type) && (
                                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-600/30 text-yellow-300">
                                                                            System
                                                                        </span>
                                                                    )}
                                                                    {slide.type === 'event' &&
                                                                        slide.start_date && (
                                                                            <span
                                                                                className="px-2 py-0.5 rounded text-xs font-medium"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        slide.color ||
                                                                                        '#3B82F6',
                                                                                    color: 'white',
                                                                                }}
                                                                            >
                                                                                {formatDate(
                                                                                    slide.start_date,
                                                                                )}
                                                                                {slide.end_date &&
                                                                                    slide.end_date !==
                                                                                        slide.start_date &&
                                                                                    ` - ${formatDate(slide.end_date)}`}
                                                                            </span>
                                                                        )}
                                                                    {sched?.hasSchedule && (
                                                                        <span
                                                                            title={sched.summary}
                                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                                                                schedOff
                                                                                    ? 'bg-yellow-900/40 border-yellow-700/60 text-yellow-400'
                                                                                    : 'bg-blue-900/40 border-blue-700/60 text-blue-300'
                                                                            }`}
                                                                        >
                                                                            🕐
                                                                            <span className="hidden sm:inline">
                                                                                {schedOff
                                                                                    ? 'OFF SCHEDULE'
                                                                                    : 'ON SCHEDULE'}
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                    <span
                                                                        className={typeInfo.color}
                                                                    >
                                                                        {typeInfo.label}
                                                                    </span>
                                                                    <span>
                                                                        {slide.duration_seconds}s
                                                                    </span>
                                                                    {slide.show_weather &&
                                                                        slide.type ===
                                                                            'youtube' && (
                                                                            <span
                                                                                className="text-blue-400"
                                                                                title="Weather enabled"
                                                                            >
                                                                                🌤️
                                                                            </span>
                                                                        )}
                                                                    {slide.show_sponsor &&
                                                                        slide.type !== 'debt' && (
                                                                            <span
                                                                                className="text-yellow-400"
                                                                                title="Sponsor enabled"
                                                                            >
                                                                                💰
                                                                            </span>
                                                                        )}
                                                                    {slide.type === 'debt' && (
                                                                        <span className="text-gray-400">
                                                                            Treasury API data
                                                                        </span>
                                                                    )}
                                                                    {slide.type === 'event' &&
                                                                        slide.description && (
                                                                            <span className="hidden md:inline truncate max-w-[200px] text-gray-400">
                                                                                {slide.description}
                                                                            </span>
                                                                        )}
                                                                    {slide.type === 'show' &&
                                                                        slide.host_name && (
                                                                            <span className="text-green-400">
                                                                                📺 {slide.host_name}
                                                                            </span>
                                                                        )}
                                                                    {slide.type === 'news' &&
                                                                        slide.headline && (
                                                                            <span className="text-orange-400 hidden md:inline truncate max-w-[200px]">
                                                                                📰 {slide.headline}
                                                                            </span>
                                                                        )}
                                                                    {slide.type === 'youtube' &&
                                                                        slide.timezone && (
                                                                            <span className="hidden md:inline truncate max-w-[150px]">
                                                                                {slide.timezone}
                                                                            </span>
                                                                        )}
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() =>
                                                                        window.open(
                                                                            `/admin/slides/preview/${slide.id}`,
                                                                            '_blank',
                                                                        )
                                                                    }
                                                                    className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#00ffff] border-2 border-[#00ffff] transition-colors font-mono text-xs"
                                                                    title="Preview slide in new tab"
                                                                >
                                                                    👁️
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleToggleActive(slide)
                                                                    }
                                                                    className={`p-2 border-2 transition-colors font-mono text-xs ${
                                                                        slide.is_active
                                                                            ? 'bg-[#00ff00] text-black border-[#00ff00] hover:bg-[#00cc00]'
                                                                            : 'bg-[#1a1a1a] text-[#888] border-[#333] hover:bg-[#2a2a2a]'
                                                                    }`}
                                                                    title={
                                                                        slide.is_active
                                                                            ? 'Active - Click to disable'
                                                                            : 'Inactive - Click to enable'
                                                                    }
                                                                >
                                                                    {slide.is_active ? '✓' : '○'}
                                                                </button>
                                                                {/* System slides: limited editing options */}
                                                                {isSystemSlide(slide.type) ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleEditDebt(
                                                                                    slide,
                                                                                )
                                                                            }
                                                                            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ffff00] border-2 border-[#ffff00] transition-colors font-mono text-xs"
                                                                            title="Edit Settings"
                                                                        >
                                                                            ⚙️
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleDuplicate(
                                                                                    slide,
                                                                                )
                                                                            }
                                                                            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#00ff00] border-2 border-[#00ff00] transition-colors font-mono text-xs"
                                                                            title="Duplicate"
                                                                        >
                                                                            📋
                                                                        </button>
                                                                        {/* Only show delete if there are multiple slides of this type */}
                                                                        {slides.filter(
                                                                            (s) =>
                                                                                s.type ===
                                                                                slide.type,
                                                                        ).length > 1 && (
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleDelete(
                                                                                        slide,
                                                                                    )
                                                                                }
                                                                                className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff0000] border-2 border-[#ff0000] transition-colors font-mono text-xs"
                                                                                title="Delete"
                                                                            >
                                                                                🗑️
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleEdit(slide)
                                                                            }
                                                                            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-2 border-[#333] transition-colors font-mono text-xs"
                                                                            title="Edit"
                                                                        >
                                                                            ✏️
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleDuplicate(
                                                                                    slide,
                                                                                )
                                                                            }
                                                                            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#00ff00] border-2 border-[#00ff00] transition-colors font-mono text-xs"
                                                                            title="Duplicate"
                                                                        >
                                                                            📋
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleDelete(slide)
                                                                            }
                                                                            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff0000] border-2 border-[#ff0000] transition-colors font-mono text-xs"
                                                                            title="Delete"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </>
                                                                )}
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
                                {editingSlide
                                    ? `EDIT: ${editingSlide.name.toUpperCase()}`
                                    : 'ADD NEW SLIDE'}
                            </h2>
                            <button
                                onClick={handleFormCancel}
                                className="text-[#00ff00] hover:text-white text-2xl font-mono"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <SlideForm
                                slide={editingSlide}
                                onSubmit={handleFormSubmit}
                                onCancel={handleFormCancel}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* System Slide Mini-Form Modal (debt, metals, fx) */}
            {isDebtFormOpen && editingDebtSlide && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0a0a0a] w-full max-w-md border-2 border-[#00ff00]">
                        <div className="p-4 border-b-2 border-[#00ff00] flex items-center justify-between">
                            <h2 className="text-lg font-mono font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="opacity-70">
                                    {getTypeInfo(editingDebtSlide.type).icon}
                                </span>
                                <span>{editingDebtSlide.name.toUpperCase()} SETTINGS</span>
                            </h2>
                            <button
                                onClick={() => setIsDebtFormOpen(false)}
                                className="text-[#00ff00] hover:text-white text-2xl font-mono"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Active Toggle */}
                            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                                <label className="text-white font-mono text-xs uppercase tracking-wider">
                                    ACTIVE
                                </label>
                                <button
                                    onClick={() =>
                                        setEditingDebtSlide({
                                            ...editingDebtSlide,
                                            is_active: !editingDebtSlide.is_active,
                                        })
                                    }
                                    className={`w-14 h-7 transition-colors border-2 ${
                                        editingDebtSlide.is_active
                                            ? 'bg-[#00ff00] border-[#00ff00]'
                                            : 'bg-[#1a1a1a] border-[#333]'
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-black transition-transform mx-0.5 ${
                                            editingDebtSlide.is_active
                                                ? 'translate-x-7'
                                                : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Sponsor Toggle */}
                            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                                <label className="text-white font-mono text-xs uppercase tracking-wider">
                                    SHOW SPONSOR
                                </label>
                                <button
                                    onClick={() =>
                                        setEditingDebtSlide({
                                            ...editingDebtSlide,
                                            show_sponsor: !editingDebtSlide.show_sponsor,
                                        })
                                    }
                                    className={`w-14 h-7 transition-colors border-2 ${
                                        editingDebtSlide.show_sponsor
                                            ? 'bg-[#ffff00] border-[#ffff00]'
                                            : 'bg-[#1a1a1a] border-[#333]'
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-black transition-transform mx-0.5 ${
                                            editingDebtSlide.show_sponsor
                                                ? 'translate-x-7'
                                                : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Duration */}
                            <div className="border-b border-[#1a1a1a] pb-3">
                                <label className="text-white font-mono text-xs uppercase tracking-wider block mb-2">
                                    DURATION (SECONDS)
                                </label>
                                <input
                                    type="number"
                                    value={debtDuration}
                                    onChange={(e) =>
                                        setDebtDuration(Math.max(5, parseInt(e.target.value) || 30))
                                    }
                                    min={5}
                                    max={300}
                                    className="w-full bg-[#1a1a1a] border-2 border-[#00ff00] px-4 py-2 text-white font-mono focus:outline-none focus:border-[#00cc00]"
                                />
                                <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                                    HOW LONG TO DISPLAY (5-300 SECONDS)
                                </p>
                            </div>

                            {/* UTC Schedule */}
                            <div className="border-b border-[#1a1a1a] pb-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-mono text-xs uppercase tracking-wider">
                                            UTC SCHEDULE
                                        </p>
                                        <p className="text-[#888] font-mono text-[10px] uppercase tracking-wider">
                                            RESTRICT TO SPECIFIC DAYS / HOURS (UTC)
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const hasSchedule =
                                                debtActiveDays !== null || debtTimeStart !== null;

                                            if (hasSchedule) {
                                                setDebtActiveDays(null);
                                                setDebtTimeStart(null);
                                                setDebtTimeEnd(null);
                                            } else {
                                                setDebtActiveDays([]);
                                                setDebtTimeStart('');
                                                setDebtTimeEnd('');
                                            }
                                        }}
                                        className={`px-3 py-1 font-mono text-xs uppercase tracking-wider border-2 transition-all ${
                                            debtActiveDays !== null || debtTimeStart !== null
                                                ? 'border-[#00aaff] bg-[#0a1a2a] text-[#00aaff]'
                                                : 'border-[#333] bg-[#1a1a1a] text-[#666] hover:border-[#00aaff] hover:text-[#00aaff]'
                                        }`}
                                    >
                                        {debtActiveDays !== null || debtTimeStart !== null
                                            ? 'ENABLED ✓'
                                            : 'ENABLE'}
                                    </button>
                                </div>

                                {(debtActiveDays !== null || debtTimeStart !== null) && (
                                    <div className="space-y-3 p-3 bg-[#0a1a2a] border border-[#00aaff]/30">
                                        {/* Day selector */}
                                        <div>
                                            <p className="text-[10px] font-mono text-[#00aaff] uppercase tracking-wider mb-2">
                                                ACTIVE DAYS (ALL UNCHECKED = EVERY DAY)
                                            </p>
                                            <div className="flex gap-1 flex-wrap">
                                                {[
                                                    { label: 'SUN', value: 0 },
                                                    { label: 'MON', value: 1 },
                                                    { label: 'TUE', value: 2 },
                                                    { label: 'WED', value: 3 },
                                                    { label: 'THU', value: 4 },
                                                    { label: 'FRI', value: 5 },
                                                    { label: 'SAT', value: 6 },
                                                ].map((day) => {
                                                    const active = (debtActiveDays ?? []).includes(
                                                        day.value,
                                                    );

                                                    return (
                                                        <button
                                                            key={day.value}
                                                            type="button"
                                                            onClick={() => {
                                                                const current =
                                                                    debtActiveDays ?? [];
                                                                const next = active
                                                                    ? current.filter(
                                                                          (d) => d !== day.value,
                                                                      )
                                                                    : [...current, day.value].sort(
                                                                          (a, b) => a - b,
                                                                      );
                                                                setDebtActiveDays(next);
                                                            }}
                                                            className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider border transition-all ${
                                                                active
                                                                    ? 'border-[#00aaff] bg-[#00aaff] text-black font-bold'
                                                                    : 'border-[#333] bg-[#111] text-[#666] hover:border-[#00aaff] hover:text-[#00aaff]'
                                                            }`}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Time range */}
                                        <div>
                                            <p className="text-[10px] font-mono text-[#00aaff] uppercase tracking-wider mb-2">
                                                ACTIVE HOURS UTC (EMPTY = ALL DAY)
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-mono text-[#555] uppercase">
                                                        FROM
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={debtTimeStart ?? ''}
                                                        onChange={(e) =>
                                                            setDebtTimeStart(e.target.value || null)
                                                        }
                                                        className="px-2 py-1 bg-[#111] border border-[#00aaff]/50 text-white font-mono text-xs focus:outline-none focus:border-[#00aaff]"
                                                    />
                                                </div>
                                                <span className="text-[#00aaff] font-mono text-xs mt-4">
                                                    →
                                                </span>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-mono text-[#555] uppercase">
                                                        TO
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={debtTimeEnd ?? ''}
                                                        onChange={(e) =>
                                                            setDebtTimeEnd(e.target.value || null)
                                                        }
                                                        className="px-2 py-1 bg-[#111] border border-[#00aaff]/50 text-white font-mono text-xs focus:outline-none focus:border-[#00aaff]"
                                                    />
                                                </div>
                                                <span className="text-[#555] font-mono text-[9px] uppercase mt-4">
                                                    UTC
                                                </span>
                                            </div>
                                            {debtTimeStart &&
                                                debtTimeEnd &&
                                                debtTimeStart >= debtTimeEnd && (
                                                    <p className="text-[10px] font-mono text-[#ffaa00] mt-1 uppercase">
                                                        ⚠ CROSSES MIDNIGHT
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="bg-[#1a1a1a] p-4 text-xs font-mono text-[#888] border-l-2 border-[#00ff00]">
                                <p className="flex items-center gap-2">
                                    <span className="opacity-70">ℹ️</span>
                                    <span>
                                        {editingDebtSlide.type === 'debt' &&
                                            'CONTENT IS FETCHED FROM THE US TREASURY API.'}
                                        {editingDebtSlide.type === 'metals' &&
                                            'CONTENT IS FETCHED FROM THE METALS API (GOLD & SILVER PRICES).'}
                                        {editingDebtSlide.type === 'fx' &&
                                            'CONTENT IS FETCHED FROM THE FX API (EUR, JPY, GBP, USD RATES).'}
                                        {editingDebtSlide.type === 'strc' &&
                                            'CONTENT IS FETCHED FROM THE STRC DATA API.'}
                                        {editingDebtSlide.type === 'sata' &&
                                            'CONTENT IS FETCHED FROM THE SATA/STRIVE DATA API.'}
                                    </span>
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-3">
                                <button
                                    onClick={() => setIsDebtFormOpen(false)}
                                    className="flex-1 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-mono text-xs uppercase tracking-wider transition-colors border-2 border-[#333]"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleSaveDebt}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 border-2 border-[#00ff00]"
                                >
                                    {isSubmitting ? 'SAVING...' : 'SAVE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

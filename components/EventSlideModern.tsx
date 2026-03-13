'use client';

import { useMemo, memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Slide, CalendarEvent } from '@/lib/supabase/types';

interface EventSlideModernProps {
    slide: Slide;
    events: CalendarEvent[];
}

// Format date as "JAN 5"
const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return `${month} ${day}`;
};

// Format date range
const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = formatDateShort(startDate);
    if (!endDate || endDate === startDate) {
        return start;
    }
    const end = formatDateShort(endDate);
    return `${start} - ${end}`;
};

// Get current month and year
const getCurrentMonthYear = () => {
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear();
    return `${month} ${year}`;
};

// Event Card for Modern Style - Reference frame style
const ModernEventCard = ({ event, index }: { event: CalendarEvent; index: number }) => {
    const dateRange = formatDateRange(event.start_date, event.end_date);
    const borderColor = event.color || '#10B981';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
            className="relative h-full aspect-square"
        >
            {/* Background Image */}
            {event.image_url ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${event.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-black/70" />
                </>
            ) : (
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(135deg, ${event.color}30 0%, #111 100%)`
                    }}
                />
            )}

            {/* Retro border frame using box-shadow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    border: `2px solid ${borderColor}`,
                    boxShadow: `
                        5px 5px 0 0 #0d0d0d,
                        5px 5px 0 1px ${borderColor},
                        10px 10px 0 0 #0d0d0d,
                        10px 10px 0 1px ${borderColor}
                    `,
                }}
            />

            {/* Content - Centered with overflow protection */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 py-6 overflow-hidden">
                {/* Date - large */}
                <p
                    className="text-[3.5rem] font-bold mb-2 flex-shrink-0"
                    style={{ color: borderColor }}
                >
                    {dateRange}
                </p>

                {/* Title - large */}
                <h2
                    className="text-[2.5rem] leading-tight font-bold text-white uppercase tracking-wide mb-4 flex-shrink-0"
                    style={{
                        fontFamily: event.title_font || 'inherit',
                        color: event.title_color || '#FFFFFF',
                        textShadow: '3px 3px 12px rgba(0,0,0,0.9)',
                    }}
                >
                    {event.title}
                </h2>

                {/* Description - smaller to fit long text */}
                {event.description && (
                    <p
                        className="text-[1.65rem] leading-snug mb-3 flex-1 overflow-hidden"
                        style={{ color: event.text_color || '#D1D5DB' }}
                    >
                        {event.description}
                    </p>
                )}

                {/* Location */}
                {event.location && (
                    <p
                        className="text-[1.6rem] uppercase tracking-wider font-medium flex-shrink-0"
                        style={{ color: '#A3A3A3' }}
                    >
                        {event.location}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

function EventSlideModernComponent({ slide, events }: EventSlideModernProps) {
    // Get selected events in order
    const selectedEvents = useMemo(() => {
        const ids = slide.selected_event_ids || [];
        if (ids.length === 0) return [];

        const eventsMap = new Map(events.map(e => [e.id, e]));
        return ids
            .map(id => eventsMap.get(id))
            .filter((e): e is CalendarEvent => e !== undefined);
    }, [slide.selected_event_ids, events]);

    const eventCount = selectedEvents.length;
    // Get month/year from first selected event, not current date
    const monthYear = useMemo(() => {
        if (selectedEvents.length === 0) return getCurrentMonthYear();
        const firstEvent = selectedEvents[0];
        const date = new Date(firstEvent.start_date + 'T00:00:00');
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        return `${month} ${year}`;
    }, [selectedEvents]);
    const customTitle = slide.event_slide_title || '';

    // No events selected
    if (eventCount === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex items-center justify-center"
                style={{
                    background: '#0d0d0d',
                    backgroundImage: `
            linear-gradient(rgba(60,60,60,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(60,60,60,0.15) 1px, transparent 1px)
          `,
                    backgroundSize: '32px 32px',
                }}
            >
                <div className="text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-white text-2xl">No events selected</p>
                    <p className="text-gray-400">Configure this slide in the admin panel</p>
                </div>
            </motion.div>
        );
    }

    // Calculate grid layout based on event count
    const getGridLayout = () => {
        switch (eventCount) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-2';
            case 3:
                return 'grid-cols-3';
            case 4:
                return 'grid-cols-2 grid-rows-2';
            default:
                return 'grid-cols-3';
        }
    };

    return (
        <div
            className="w-full h-full flex flex-col"
            style={{
                background: '#0d0d0d',
                backgroundImage: `
          linear-gradient(rgba(60,60,60,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(60,60,60,0.15) 1px, transparent 1px)
        `,
                backgroundSize: '32px 32px',
            }}
        >
            {/* Header - Pixel Perfect */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between px-10 pt-8 pb-6"
            >
                {/* Left: Month/Year + Logo */}
                <div className="flex flex-col">
                    <h1
                        className="text-[4.5rem] leading-none font-bold tracking-tight"
                        style={{
                            color: '#10B981',
                            fontStyle: 'italic',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                    >
                        {monthYear}
                    </h1>
                    <div className="flex items-center gap-4 mt-3">
                        {/* Logo rtvwhite.png only */}
                        <Image
                            src="/rtvwhite.png"
                            alt="ROXOM.TV"
                            width={180}
                            height={48}
                            className="h-12 w-auto"
                        />
                    </div>
                </div>

                {/* Right: Custom Title - Single line */}
                <div className="text-right">
                    <h2 className="text-[3.5rem] leading-none font-bold text-white whitespace-nowrap">
                        {customTitle}
                    </h2>
                </div>
            </motion.div>

            {/* Events Grid - Centered horizontally */}
            <div className={`flex-1 grid ${getGridLayout()} gap-5 px-10 pb-10 place-content-center`}>
                {selectedEvents.map((event, index) => (
                    <ModernEventCard key={event.id} event={event} index={index} />
                ))}
            </div>
        </div>
    );
}

// Memoize component
export default memo(EventSlideModernComponent, (prevProps, nextProps) => {
    if (prevProps.slide.id !== nextProps.slide.id) return false;
    if (prevProps.slide.selected_event_ids?.join(',') !== nextProps.slide.selected_event_ids?.join(',')) return false;
    if (prevProps.slide.event_slide_title !== nextProps.slide.event_slide_title) return false;

    const prevIds = prevProps.slide.selected_event_ids || [];
    for (const id of prevIds) {
        const prevEvent = prevProps.events.find(e => e.id === id);
        const nextEvent = nextProps.events.find(e => e.id === id);
        if (!prevEvent || !nextEvent) return false;
        if (prevEvent.updated_at !== nextEvent.updated_at) return false;
    }

    return true;
});

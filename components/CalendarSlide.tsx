'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CalendarEvent } from '@/lib/supabase/types';

interface CalendarSlideProps {
  events: CalendarEvent[];
}

export default function CalendarSlide({ events }: CalendarSlideProps) {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Filter only upcoming/current events
  const upcomingEvents = useMemo(() => {
    return events.filter(event => {
      const endDate = event.end_date ? new Date(event.end_date + 'T23:59:59') : new Date(event.start_date + 'T23:59:59');
      return endDate >= today;
    }).slice(0, 8); // Max 8 events
  }, [events, today]);

  // Determine layout based on event count
  const layout = useMemo(() => {
    const count = upcomingEvents.length;
    if (count === 0) return 'empty';
    if (count === 1) return 'single';
    if (count === 2) return 'double';
    if (count <= 4) return 'grid-4';
    return 'grid-8';
  }, [upcomingEvents.length]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  // Format time
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Check if event is today
  const isToday = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    return eventDate.toDateString() === today.toDateString();
  };

  // Check if event spans multiple days
  const isMultiDay = (event: CalendarEvent) => {
    return event.end_date && event.end_date !== event.start_date;
  };

  if (layout === 'empty') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
        <div className="text-8xl mb-6">📅</div>
        <h1 className="text-4xl font-bold text-white mb-2">No Upcoming Events</h1>
        <p className="text-gray-400 text-xl">Check back later for updates</p>
      </div>
    );
  }

  // Render single event (full screen)
  if (layout === 'single') {
    const event = upcomingEvents[0];
    const date = formatDate(event.start_date);
    const time = formatTime(event.start_time);
    const endTime = formatTime(event.end_time);
    const todayEvent = isToday(event.start_date);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full relative overflow-hidden"
      >
        {/* Background Image or Gradient */}
        {event.image_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.image_url})` }}
          >
            <div className="absolute inset-0 bg-black/60" />
          </div>
        ) : (
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(135deg, ${event.color}40 0%, ${event.color}10 50%, #000 100%)` 
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-center">
          {/* Date Badge */}
          <div className="mb-8">
            <div 
              className="inline-flex flex-col items-center px-8 py-4 rounded-2xl"
              style={{ backgroundColor: event.color }}
            >
              {todayEvent && (
                <span className="text-white text-lg font-bold mb-1 animate-pulse">TODAY</span>
              )}
              <span className="text-white text-2xl font-medium">{date.weekday}</span>
              <span className="text-white text-6xl font-bold">{date.day}</span>
              <span className="text-white text-2xl font-medium">{date.month}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 drop-shadow-lg max-w-5xl">
            {event.title}
          </h1>

          {/* Description */}
          {event.description && (
            <p className="text-2xl md:text-3xl text-gray-200 mb-6 max-w-4xl">
              {event.description}
            </p>
          )}

          {/* Time */}
          {time && (
            <div className="text-3xl text-white font-medium">
              🕐 {time}{endTime && ` - ${endTime}`}
            </div>
          )}

          {/* Multi-day indicator */}
          {isMultiDay(event) && (
            <div className="mt-4 text-xl text-gray-300">
              Through {formatDate(event.end_date!).month} {formatDate(event.end_date!).day}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Event Card Component
  const EventCard = ({ event, size }: { event: CalendarEvent; size: 'large' | 'medium' | 'small' }) => {
    const date = formatDate(event.start_date);
    const time = formatTime(event.start_time);
    const todayEvent = isToday(event.start_date);

    const sizeClasses = {
      large: 'p-8',
      medium: 'p-6',
      small: 'p-4',
    };

    const titleClasses = {
      large: 'text-4xl',
      medium: 'text-2xl',
      small: 'text-xl',
    };

    const dateClasses = {
      large: 'text-5xl',
      medium: 'text-3xl',
      small: 'text-2xl',
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative h-full rounded-2xl overflow-hidden ${sizeClasses[size]}`}
        style={{ 
          background: event.image_url 
            ? undefined 
            : `linear-gradient(135deg, ${event.color}30 0%, ${event.color}10 100%)`,
          borderLeft: `4px solid ${event.color}`,
        }}
      >
        {/* Background Image */}
        {event.image_url && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${event.image_url})` }}
            />
            <div className="absolute inset-0 bg-black/70" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Date */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="flex flex-col items-center px-4 py-2 rounded-lg"
              style={{ backgroundColor: event.color }}
            >
              <span className={`text-white font-bold ${dateClasses[size]}`}>{date.day}</span>
              <span className="text-white text-sm font-medium">{date.month}</span>
            </div>
            {todayEvent && (
              <span 
                className="px-3 py-1 rounded-full text-sm font-bold animate-pulse"
                style={{ backgroundColor: event.color, color: 'white' }}
              >
                TODAY
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className={`font-bold text-white ${titleClasses[size]} mb-2 line-clamp-2`}>
            {event.title}
          </h2>

          {/* Description */}
          {event.description && size !== 'small' && (
            <p className="text-gray-300 text-sm flex-1 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Time */}
          {time && (
            <div className="text-gray-400 text-sm mt-auto pt-2">
              🕐 {time}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Grid layouts
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">

      {/* Grid */}
      {layout === 'double' && (
        <div className="grid grid-cols-2 gap-6 h-[calc(100%-5rem)]">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} size="large" />
          ))}
        </div>
      )}

      {layout === 'grid-4' && (
        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100%-5rem)]">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} size="medium" />
          ))}
        </div>
      )}

      {layout === 'grid-8' && (
        <div className="grid grid-cols-4 grid-rows-2 gap-4 h-[calc(100%-5rem)]">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} size="small" />
          ))}
        </div>
      )}
    </div>
  );
}

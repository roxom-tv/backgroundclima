'use client';

import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import type { Slide, CalendarEvent, ScheduleTime } from '@/lib/supabase/types';

interface EventSlideProps {
  slide: Slide;
  events: CalendarEvent[];
}

// Get font size class based on title_size and layout size - LARGER sizes
const getTitleSizeClass = (
  titleSize: string | null | undefined, 
  layoutSize: 'full' | 'half' | 'third' | 'quarter'
) => {
  const sizes = {
    full: {
      small: 'text-5xl md:text-6xl',
      medium: 'text-6xl md:text-7xl',
      large: 'text-7xl md:text-8xl',
      xlarge: 'text-8xl md:text-9xl',
    },
    half: {
      small: 'text-3xl md:text-4xl',
      medium: 'text-4xl md:text-5xl',
      large: 'text-5xl md:text-6xl',
      xlarge: 'text-6xl md:text-7xl',
    },
    third: {
      small: 'text-2xl md:text-3xl',
      medium: 'text-3xl md:text-4xl',
      large: 'text-4xl md:text-5xl',
      xlarge: 'text-5xl md:text-6xl',
    },
    quarter: {
      small: 'text-xl md:text-2xl',
      medium: 'text-2xl md:text-3xl',
      large: 'text-3xl md:text-4xl',
      xlarge: 'text-4xl md:text-5xl',
    },
  };
  
  const size = titleSize || 'large';
  return sizes[layoutSize][size as keyof typeof sizes.full] || sizes[layoutSize].large;
};

// Get description size class based on layout
const getDescSizeClass = (layoutSize: 'full' | 'half' | 'third' | 'quarter') => {
  const sizes = {
    full: 'text-2xl md:text-3xl',
    half: 'text-lg md:text-xl',
    third: 'text-base md:text-lg',
    quarter: 'text-sm md:text-base',
  };
  return sizes[layoutSize];
};

// Parse schedule_times - handles both array and JSON string
const parseScheduleTimes = (times: ScheduleTime[] | string | null | undefined): ScheduleTime[] => {
  if (!times) return [];
  if (Array.isArray(times)) return times;
  if (typeof times === 'string') {
    try {
      return JSON.parse(times);
    } catch {
      return [];
    }
  }
  return [];
};

function EventSlideComponent({ slide, events }: EventSlideProps) {
  // Get selected events in order - memoize with stable reference
  const selectedEvents = useMemo(() => {
    const ids = slide.selected_event_ids || [];
    if (ids.length === 0) return [];
    
    // Create a map for O(1) lookup
    const eventsMap = new Map(events.map(e => [e.id, e]));
    
    return ids
      .map(id => eventsMap.get(id))
      .filter((e): e is CalendarEvent => e !== undefined);
  }, [slide.selected_event_ids, events]);

  const eventCount = selectedEvents.length;
  const orientation = slide.layout_orientation || 'horizontal';

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      full: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
  };

  // Check if event is today
  const isToday = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + 'T00:00:00');
    return eventDate.toDateString() === today.toDateString();
  };

  // No events selected
  if (eventCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-white text-2xl">No events selected</p>
          <p className="text-gray-400">Configure this slide in the admin panel</p>
        </div>
      </motion.div>
    );
  }

  // Single Event Card Component - Full Screen - CENTERED
  const SingleEventCard = ({ event }: { event: CalendarEvent }) => {
    const date = formatDate(event.start_date);
    const todayEvent = isToday(event.start_date);
    const scheduleTimes = parseScheduleTimes(event.schedule_times);
    
    // Style customizations
    const titleFont = event.title_font || 'inherit';
    const titleColor = event.title_color || '#FFFFFF';
    const textColor = event.text_color || '#E5E7EB';
    const overlayOpacity = 0.8; // Fixed 80% transparency overlay
    const showDateBadge = event.show_date_badge ?? true;
    const titleSizeClass = getTitleSizeClass(event.title_size, 'full');

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full relative overflow-hidden"
      >
        {/* Background */}
        {event.image_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.image_url})` }}
          >
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
            />
          </div>
        ) : (
          <div 
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${event.color}40 0%, ${event.color}10 50%, #000 100%)` }}
          />
        )}

        {/* Content - CENTERED */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 md:p-12 text-center">
          {/* Date Badge */}
          {showDateBadge && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 md:mb-8"
            >
              <div 
                className="inline-flex flex-col items-center px-8 md:px-12 py-4 md:py-6 rounded-2xl shadow-2xl"
                style={{ backgroundColor: event.color }}
              >
                {todayEvent && (
                  <span className="text-white text-lg md:text-xl font-bold mb-2 animate-pulse">TODAY</span>
                )}
                <span className="text-white text-2xl md:text-3xl font-medium">{date.weekday}</span>
                <span className="text-white text-6xl md:text-8xl font-bold leading-none">{date.day}</span>
                <span className="text-white text-2xl md:text-3xl font-medium">{date.month}</span>
              </div>
            </motion.div>
          )}

          {/* Title - CENTERED & LARGER */}
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`font-bold mb-4 md:mb-6 drop-shadow-2xl max-w-6xl text-center ${titleSizeClass}`}
            style={{ 
              fontFamily: titleFont,
              color: titleColor,
              textShadow: '2px 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {event.title}
          </motion.h1>

          {/* Description - ALWAYS VISIBLE */}
          {event.description && (
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl lg:text-3xl mb-6 max-w-4xl text-center leading-relaxed"
              style={{ 
                color: textColor,
                textShadow: '1px 1px 10px rgba(0,0,0,0.6)',
              }}
            >
              {event.description}
            </motion.p>
          )}

          {/* Multiple Timezone Times */}
          {scheduleTimes.length > 0 && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3 md:gap-4"
            >
              {scheduleTimes.map((schedule, index) => (
                <div 
                  key={index}
                  className="text-xl md:text-2xl font-semibold px-4 md:px-6 py-2 md:py-3 rounded-xl"
                  style={{ 
                    color: textColor,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: `1px solid ${event.color}`,
                  }}
                >
                  🕐 {schedule.time} <span className="opacity-80">{schedule.timezone}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  // Multi-Event Card Component - CENTERED titles
  const EventCard = ({ event, size }: { event: CalendarEvent; size: 'half' | 'third' | 'quarter' }) => {
    const date = formatDate(event.start_date);
    const todayEvent = isToday(event.start_date);
    const scheduleTimes = parseScheduleTimes(event.schedule_times);
    
    // Style customizations
    const titleFont = event.title_font || 'inherit';
    const titleColor = event.title_color || '#FFFFFF';
    const textColor = event.text_color || '#E5E7EB';
    const overlayOpacity = 0.8; // Fixed 80% transparency overlay
    const showDateBadge = event.show_date_badge ?? true;
    const titleSizeClass = getTitleSizeClass(event.title_size, size);
    const descSizeClass = getDescSizeClass(size);

    const sizeConfig = {
      half: { date: 'text-4xl md:text-5xl', padding: 'p-6 md:p-8', descLines: 3, timeSize: 'text-lg md:text-xl' },
      third: { date: 'text-3xl md:text-4xl', padding: 'p-4 md:p-6', descLines: 2, timeSize: 'text-base md:text-lg' },
      quarter: { date: 'text-2xl md:text-3xl', padding: 'p-3 md:p-5', descLines: 2, timeSize: 'text-sm md:text-base' },
    };

    const config = sizeConfig[size];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative h-full overflow-hidden ${config.padding}`}
      >
        {/* Background */}
        {event.image_url ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${event.image_url})` }}
            />
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
            />
          </>
        ) : (
          <div 
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${event.color}30 0%, ${event.color}10 100%)` }}
          />
        )}

        {/* Accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 md:w-2"
          style={{ backgroundColor: event.color }}
        />

        {/* Content - CENTERED */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-2">
          {/* Date badge */}
          {showDateBadge && (
            <div className="mb-3 md:mb-4">
              <div 
                className="inline-flex flex-col items-center px-3 md:px-4 py-2 rounded-xl shadow-lg"
                style={{ backgroundColor: event.color }}
              >
                {todayEvent && (
                  <span className="text-white text-xs font-bold animate-pulse">TODAY</span>
                )}
                <span className={`text-white font-bold ${config.date}`}>{date.day}</span>
                <span className="text-white text-xs md:text-sm font-medium uppercase">{date.month}</span>
              </div>
            </div>
          )}

          {/* Title - CENTERED */}
          <h2 
            className={`font-bold mb-2 md:mb-3 drop-shadow-lg text-center ${titleSizeClass}`}
            style={{ 
              fontFamily: titleFont,
              color: titleColor,
              textShadow: '1px 1px 10px rgba(0,0,0,0.6)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.title}
          </h2>

          {/* Description - ALWAYS VISIBLE */}
          {event.description && (
            <p 
              className={`${descSizeClass} mb-2 md:mb-3 text-center leading-snug`}
              style={{ 
                color: textColor,
                textShadow: '1px 1px 5px rgba(0,0,0,0.5)',
                display: '-webkit-box',
                WebkitLineClamp: config.descLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {event.description}
            </p>
          )}

          {/* Multiple Timezone Times */}
          {scheduleTimes.length > 0 && (
            <div className="mt-auto pt-2 flex flex-wrap justify-center gap-1 md:gap-2">
              {scheduleTimes.slice(0, size === 'quarter' ? 2 : 3).map((schedule, index) => (
                <div 
                  key={index}
                  className={`${config.timeSize} font-medium px-2 md:px-3 py-1 rounded-lg`}
                  style={{ 
                    color: textColor,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}
                >
                  {schedule.time} <span className="opacity-70">{schedule.timezone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Render based on event count
  if (eventCount === 1) {
    return <SingleEventCard event={selectedEvents[0]} />;
  }

  // 2 events - split screen
  if (eventCount === 2) {
    return (
      <div className="w-full h-full grid grid-cols-2 bg-black gap-0.5">
        {selectedEvents.map((event) => (
          <EventCard key={event.id} event={event} size="half" />
        ))}
      </div>
    );
  }

  // 3 events - 3 columns or 3 rows based on orientation
  if (eventCount === 3) {
    return (
      <div className={`w-full h-full bg-black gap-0.5 ${
        orientation === 'horizontal' ? 'grid grid-cols-3' : 'grid grid-rows-3'
      }`}>
        {selectedEvents.map((event) => (
          <EventCard key={event.id} event={event} size="third" />
        ))}
      </div>
    );
  }

  // 4 events - 2x2 grid
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 bg-black gap-0.5">
      {selectedEvents.map((event) => (
        <EventCard key={event.id} event={event} size="quarter" />
      ))}
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(EventSlideComponent, (prevProps, nextProps) => {
  // Only re-render if slide ID or selected event IDs change
  if (prevProps.slide.id !== nextProps.slide.id) return false;
  if (prevProps.slide.selected_event_ids?.join(',') !== nextProps.slide.selected_event_ids?.join(',')) return false;
  
  // Check if any of the selected events have changed
  const prevIds = prevProps.slide.selected_event_ids || [];
  const nextIds = nextProps.slide.selected_event_ids || [];
  
  if (prevIds.length !== nextIds.length) return false;
  
  // Check if the actual event data for selected events has changed
  for (const id of prevIds) {
    const prevEvent = prevProps.events.find(e => e.id === id);
    const nextEvent = nextProps.events.find(e => e.id === id);
    
    if (!prevEvent || !nextEvent) return false;
    if (prevEvent.updated_at !== nextEvent.updated_at) return false;
  }
  
  return true; // Props are equal, skip re-render
});



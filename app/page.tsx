'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RotatingBackground from './components/RotatingBackground';
import WeatherBar from './components/WeatherBar';
import DateDisplay from './components/DateDisplay';
import LiveIndicator from './components/LiveIndicator';
import SponsorDisplay from './components/SponsorDisplay';
import TransitionEffectComponent from './components/TransitionEffect';
import CalendarSlide from '@/components/CalendarSlide';
import EventSlide from '@/components/EventSlide';
import ShowSlide from '@/components/ShowSlide';
import DebtSlide from '@/components/DebtSlide';
import { prefetchDebtData } from '@/components/DebtSlide';
import MetalsSlide from '@/components/MetalsSlide';
import FxSlide from '@/components/FxSlide';
import NewsSlide from '@/components/NewsSlide';
import VideoSlide from '@/components/VideoSlide';
import StrcSlide from '@/components/StrcSlide';
import SacaSlide from '@/components/SacaSlide';
import { useRealtimeConfig } from '@/hooks/useRealtimeConfig';
import { prefetchAllWeatherData } from '@/lib/weather-prefetch';
import { prefetchMarketsData } from '@/hooks/useMarketsSats';
import type { Slide, Sponsor, SponsorPosition } from '@/lib/supabase/types';

export default function Home() {
  // Current slide index - follows order_index from database
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Transition states
  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('');

  // Get configuration from Supabase with real-time updates
  // slides array is already ordered by order_index and contains only active slides
  const { slides, settings, sponsors, events, isLoading, error, errorInfo, retry } = useRealtimeConfig();

  // Current slide
  const currentSlide = useMemo(() => {
    if (slides.length === 0) return null;
    return slides[currentSlideIndex % slides.length];
  }, [slides, currentSlideIndex]);

  // Check if we have certain slide types for prefetching
  const hasYouTubeSlides = useMemo(() =>
    slides.some(s => s.type === 'youtube'), [slides]);
  const hasMarketSlides = useMemo(() =>
    slides.some(s => s.type === 'metals' || s.type === 'fx'), [slides]);
  const hasDebtSlides = useMemo(() =>
    slides.some(s => s.type === 'debt'), [slides]);

  // Get sponsor for a specific position on the current slide
  const getSponsorForPosition = (slide: Slide | null, position: SponsorPosition): Sponsor | null => {
    if (!slide || !slide.show_sponsor) return null;

    // Map position to the corresponding slide field
    const positionFieldMap: Record<SponsorPosition, keyof Slide> = {
      top_left: 'sponsor_top_left',
      top_right: 'sponsor_top_right',
      bottom_left: 'sponsor_bottom_left',
      bottom_right: 'sponsor_bottom_right',
    };

    const sponsorId = slide[positionFieldMap[position]] as string | null;

    if (sponsorId) {
      return sponsors.find(s => s.id === sponsorId && s.is_active) || null;
    }

    // Fallback for bottom_right: use legacy sponsor_id if position fields are empty
    if (position === 'bottom_right' && slide.sponsor_id) {
      return sponsors.find(s => s.id === slide.sponsor_id && s.is_active) || null;
    }

    return null;
  };

  // Helper to render all positioned sponsors for a slide
  const renderPositionedSponsors = (slide: Slide) => {
    if (!settings.show_sponsors || !slide.show_sponsor) return null;

    const positions: SponsorPosition[] = ['top_left', 'top_right', 'bottom_left', 'bottom_right'];

    return (
      <>
        {positions.map(position => {
          const sponsor = getSponsorForPosition(slide, position);
          if (!sponsor) return null;

          return (
            <SponsorDisplay
              key={position}
              sponsor={sponsor}
              position={position}
              visible={true}
              showLabel={position.startsWith('bottom')} // Only show "Presented by" on bottom positions
            />
          );
        })}
      </>
    );
  };

  // Legacy: Get sponsor for current slide (for backward compat with bottom-right only)
  const currentSlideSponsor = getSponsorForPosition(currentSlide, 'bottom_right');

  // Pre-fetch weather data if there are YouTube slides
  useEffect(() => {
    if (hasYouTubeSlides) {
      prefetchAllWeatherData().catch(err => console.warn('Weather prefetch failed:', err));
    }
  }, [hasYouTubeSlides]);

  // Warm up markets data as early as possible to avoid delay on early market slides.
  useEffect(() => {
    prefetchMarketsData().catch(err => console.warn('Markets warmup prefetch failed:', err));
  }, []);

  // Pre-fetch markets data if there are metals or fx slides
  useEffect(() => {
    if (hasMarketSlides) {
      prefetchMarketsData().catch(err => console.warn('Markets prefetch failed:', err));
    }
  }, [hasMarketSlides]);

  // Warm up debt data when debt slides are present.
  useEffect(() => {
    if (!hasDebtSlides) return;
    prefetchDebtData()
      .catch((err) => console.warn('Debt warmup prefetch failed:', err));
  }, [hasDebtSlides]);

  // Reset index when slides change (e.g., reorder, add, remove)
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(0);
    }
  }, [slides.length, currentSlideIndex]);

  // Main rotation logic - simple sequential rotation
  useEffect(() => {
    if (isLoading || slides.length === 0 || !currentSlide) return;

    // Skip auto-advance for video slides with loop_count = 1 (they advance on video end)
    if (currentSlide.type === 'video' && currentSlide.loop_count === 1) {
      return;
    }

    const transitionEffect = settings.transition_effect || 'tv_static';

    // Get next slide info early to determine transition behavior
    const nextIndex = (currentSlideIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];
    const isNextYouTube = nextSlide?.type === 'youtube';

    // Different transition delays based on effect and slide type
    // YouTube videos need longer delays, other slides can be faster
    const transitionDelays: Record<string, number> = {
      'none': 0,
      'fade': isNextYouTube ? 600 : 300,  // Faster for non-YouTube slides
      'slide': isNextYouTube ? 700 : 400,  // Faster for non-YouTube slides
      'tv_static': isNextYouTube ? 1400 : 0,  // Only for YouTube
    };

    const transitionDelay = transitionDelays[transitionEffect] || (isNextYouTube ? 1400 : 300);
    const duration = currentSlide.duration_seconds || settings.default_duration_seconds;

    const timeoutId = setTimeout(() => {
      // Get transition text based on next slide type
      let text = 'SWITCHING...';
      if (nextSlide) {
        switch (nextSlide.type) {
          case 'youtube': text = 'SWITCHING FEED...'; break;
          case 'debt': text = 'LOADING US DEBT...'; break;
          case 'metals': text = 'LOADING METALS...'; break;
          case 'fx': text = 'LOADING FX...'; break;
          case 'show': text = 'LOADING SHOW...'; break;
          case 'event': text = 'LOADING EVENT...'; break;
          case 'calendar': text = 'LOADING CALENDAR...'; break;
          case 'news': text = 'LOADING NEWS...'; break;
          case 'video': text = 'LOADING VIDEO...'; break;
          case 'strc': text = 'LOADING STRC...'; break;
          case 'saca': text = 'LOADING SACA...'; break;
          default: text = 'SWITCHING...';
        }
      }

      setTransitionText(text);
      // YouTube slides handle their own transition overlay via RotatingBackground
      // Only show global overlay for non-YouTube slides with fade/slide effects
      setShowTransition(!isNextYouTube && (transitionEffect === 'fade' || transitionEffect === 'slide'));

      // Wait for transition overlay to appear, then change slide
      setTimeout(() => {
        setCurrentSlideIndex(nextIndex);
        // Wait for new slide to be fully visible before hiding transition
        // Adjust hideDelay based on slide type
        let hideDelay = 700;
        if (nextSlide?.type === 'event') {
          hideDelay = 900; // Extra time for event slide animations and image loading
        } else {
          hideDelay = 400; // Faster for slides that load instantly
        }
        setTimeout(() => {
          setShowTransition(false);
        }, transitionEffect === 'none' ? 0 : hideDelay);
      }, transitionDelay);
    }, duration * 1000);

    return () => clearTimeout(timeoutId);
  }, [currentSlideIndex, currentSlide, slides, isLoading, settings.default_duration_seconds, settings.transition_effect]);

  // Loading state
  if (isLoading) {
    return (
      <main className="h-screen w-screen overflow-hidden relative bg-black flex items-center justify-center">
        <div className="text-white text-2xl tracking-wider animate-pulse">
          LOADING CONFIGURATION...
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="h-screen w-screen overflow-hidden relative bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-3xl border border-red-500/60 bg-[#0a0a0a] rounded-xl p-6 md:p-8 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <div className="text-red-500 text-2xl md:text-3xl font-bold tracking-wider">CONFIGURATION ERROR</div>
          <div className="text-white text-lg mt-3">{error}</div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-black/50 border border-white/10 rounded-md p-3">
              <div className="text-gray-400 uppercase tracking-wide text-xs mb-1">Error Code</div>
              <div className="text-white font-mono">{errorInfo?.code || 'UNKNOWN'}</div>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-md p-3">
              <div className="text-gray-400 uppercase tracking-wide text-xs mb-1">HTTP Status</div>
              <div className="text-white font-mono">{errorInfo?.status || 500}</div>
            </div>
          </div>

          {errorInfo?.hint ? (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-400/30 rounded-md p-3">
              <div className="text-yellow-300 uppercase tracking-wide text-xs mb-1">Hint</div>
              <div className="text-yellow-100">{errorInfo.hint}</div>
            </div>
          ) : null}

          {errorInfo?.traceId ? (
            <div className="mt-4 text-xs text-gray-400 font-mono">
              traceId: <span className="text-gray-200">{errorInfo.traceId}</span>
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => {
                void retry();
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-semibold tracking-wide transition-colors"
            >
              Retry
            </button>
            <div className="text-gray-400 text-sm">Reintenta la carga de configuracion sin recargar la pagina.</div>
          </div>
        </div>
      </main>
    );
  }

  // No slides configured
  if (slides.length === 0) {
    return (
      <main className="h-screen w-screen overflow-hidden relative bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-yellow-500 text-2xl font-bold tracking-wider">NO SLIDES CONFIGURED</div>
        <div className="text-white text-lg">Go to /admin to add slides</div>
      </main>
    );
  }

  // Render the appropriate slide based on type
  const renderSlide = () => {
    if (!currentSlide) return null;

    switch (currentSlide.type) {
      case 'youtube':
        return (
          <>
            <RotatingBackground
              activeIndex={currentSlideIndex}
              slides={slides.filter(s => s.type === 'youtube')}
              currentSlide={currentSlide}
              disableInternalOverlay={showTransition}
            />

            <div className="top-info-bar">
              <DateDisplay
                activeIndex={currentSlideIndex}
                timezone={currentSlide.timezone || undefined}
              />
              <LiveIndicator visible={settings.show_live_indicator} />
            </div>

            <div className="bottom-info-bar">
              <WeatherBar
                activeIndex={currentSlideIndex}
                currentSlide={currentSlide}
                visible={currentSlide.show_weather}
              />
              <SponsorDisplay
                sponsor={currentSlideSponsor}
                sponsors={sponsors}
                visible={settings.show_sponsors && (currentSlide.show_sponsor ?? true)}
              />
            </div>
            {/* Multi-position sponsors */}
            {renderPositionedSponsors(currentSlide)}
          </>
        );

      case 'debt':
        return (
          <motion.div
            key={`debt-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <DebtSlide />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'metals':
        return (
          <motion.div
            key={`metals-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <MetalsSlide />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'fx':
        return (
          <motion.div
            key={`fx-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <FxSlide />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'show':
        return (
          <motion.div
            key={`show-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <ShowSlide slide={currentSlide} />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'event':
        return (
          <motion.div
            key={`event-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <EventSlide slide={currentSlide} events={events} />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'calendar':
        return (
          <motion.div
            key={`calendar-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full flex items-center justify-center bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <CalendarSlide events={events} />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'news':
        return (
          <motion.div
            key={`news-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <NewsSlide slide={currentSlide} duration={currentSlide.duration_seconds} />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'video':
        return (
          <motion.div
            key={`video-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <VideoSlide
              slide={currentSlide}
              onVideoEnd={() => {
                // When video ends (if loop_count is set and all loops completed), advance to next slide
                if (currentSlide.loop_count !== null) {
                  const nextIndex = (currentSlideIndex + 1) % slides.length;
                  setCurrentSlideIndex(nextIndex);
                }
              }}
            />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'strc':
        return (
          <motion.div
            key={`strc-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <StrcSlide />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      case 'saca':
        return (
          <motion.div
            key={`saca-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.4 }
            }}
            className="h-full w-full bg-black relative"
            style={{ position: 'absolute', inset: 0 }}
          >
            <SacaSlide />
            {renderPositionedSponsors(currentSlide)}
          </motion.div>
        );

      default:
        return (
          <div className="h-full w-full bg-black flex items-center justify-center">
            <div className="text-white text-xl">Unknown slide type: {currentSlide.type}</div>
          </div>
        );
    }
  };

  const transitionEffect = settings.transition_effect || 'tv_static';

  // Calculate effective effect based on next slide type
  // Force fade for non-YouTube slides, use configured effect for YouTube
  const nextIndex = (currentSlideIndex + 1) % slides.length;
  const nextSlide = slides[nextIndex];
  const effectiveEffect = nextSlide?.type === 'youtube'
    ? transitionEffect
    : 'fade'; // Force fade for non-YouTube slides

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-black" style={{ margin: 0, padding: 0 }}>
      {/* Transition Effect - Above everything */}
      <AnimatePresence mode="wait">
        {showTransition && (
          <TransitionEffectComponent
            key={`transition-${currentSlideIndex}`}
            effect={effectiveEffect}
            isVisible={showTransition}
            text={transitionText}
          />
        )}
      </AnimatePresence>

      {/* Current Slide Container - Position relative for absolute children */}
      <div className="relative w-full h-full" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <AnimatePresence mode="wait" initial={false}>
          {currentSlide && renderSlide()}
        </AnimatePresence>
      </div>
    </main>
  );
}

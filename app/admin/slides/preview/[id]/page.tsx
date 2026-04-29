'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RotatingBackground from '@/app/components/RotatingBackground';
import WeatherBar from '@/app/components/WeatherBar';
import DateDisplay from '@/app/components/DateDisplay';
import LiveIndicator from '@/app/components/LiveIndicator';
import SponsorDisplay from '@/app/components/SponsorDisplay';
import EventSlide from '@/components/EventSlide';
import ShowSlide from '@/components/ShowSlide';
import DebtSlide from '@/components/DebtSlide';
import MetalsSlide from '@/components/MetalsSlide';
import FxSlide from '@/components/FxSlide';
import NewsSlide from '@/components/NewsSlide';
import VideoSlide from '@/components/VideoSlide';
import StrcSlide from '@/components/StrcSlide';
import SataSlide from '@/components/SataSlide';
import MarketSlide from '@/MarketSlide';
import { useRealtimeConfig } from '@/hooks/useRealtimeConfig';
import type { Slide, Sponsor } from '@/lib/supabase/types';

export default function SlidePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slideId = params.id as string;
  
  const [slide, setSlide] = useState<Slide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { settings, sponsors, events } = useRealtimeConfig();

  // Fetch the specific slide
  useEffect(() => {
    const fetchSlide = async () => {
      try {
        const response = await fetch(`/api/admin/slides/${slideId}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Failed to load slide');
        }

        setSlide(result.data as Slide);
      } catch (err) {
        console.error('Error fetching slide:', err);
        setError(err instanceof Error ? err.message : 'Failed to load slide');
      } finally {
        setIsLoading(false);
      }
    };

    if (slideId) {
      fetchSlide();
    }
  }, [slideId]);

  // Get sponsor for slide
  const getSponsorForSlide = (slide: Slide | null): Sponsor | null => {
    if (!slide || !slide.show_sponsor) return null;
    
    if (slide.sponsor_id) {
      return sponsors.find(s => s.id === slide.sponsor_id && s.is_active) || null;
    }
    
    return sponsors.find(s => s.is_active) || null;
  };

  const slideSponsor = getSponsorForSlide(slide);

  // Render slide based on type
  const renderSlide = () => {
    if (!slide) return null;

    switch (slide.type) {
      case 'youtube':
        return (
          <>
            <RotatingBackground
              activeIndex={0}
              slides={[slide]}
              currentSlide={slide}
            />
            <div className="top-info-bar">
              <DateDisplay 
                activeIndex={0}
                timezone={slide.timezone || undefined}
              />
              <LiveIndicator visible={settings.show_live_indicator} />
            </div>
            <div className="bottom-info-bar">
              <WeatherBar 
                activeIndex={0}
                currentSlide={slide}
                visible={slide.show_weather}
              />
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? true)}
              />
            </div>
          </>
        );

      case 'show':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <ShowSlide slide={slide} />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? true)}
              />
            </div>
          </div>
        );

      case 'event':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <EventSlide slide={slide} events={events} />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'news':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <NewsSlide slide={slide} duration={slide.duration_seconds} />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <VideoSlide
              slide={slide}
              onVideoEnd={() => {}}
            />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'debt':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <DebtSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'metals':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <MetalsSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'fx':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <FxSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay 
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'market':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <MarketSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'strc':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <StrcSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      case 'sata':
        return (
          <div className="h-full w-full bg-black relative" style={{ position: 'absolute', inset: 0 }}>
            <SataSlide />
            <div className="absolute bottom-4 right-4 z-20">
              <SponsorDisplay
                sponsors={slideSponsor ? [slideSponsor] : sponsors}
                visible={settings.show_sponsors && (slide.show_sponsor ?? false)}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full w-full bg-black flex items-center justify-center">
            <p className="text-white font-mono text-xl">Unknown slide type: {slide.type}</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl font-mono uppercase tracking-wider animate-pulse">LOADING PREVIEW...</div>
      </div>
    );
  }

  if (error || !slide) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-red-500 text-2xl font-mono font-bold uppercase tracking-wider text-center">
          PREVIEW ERROR
        </div>
        <div className="text-white text-lg font-mono text-center max-w-2xl">
          {error || 'Slide not found'}
        </div>
        <button
          onClick={() => router.push('/admin/slides')}
          className="px-6 py-3 bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-sm uppercase tracking-wider transition-colors border-2 border-[#00ff00]"
        >
          BACK TO SLIDES
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      {/* Preview Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-[#0a0a0a] border-b-2 border-[#00ff00] px-4 py-2">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[#00ff00] font-mono text-xs uppercase tracking-wider">PREVIEW MODE</span>
            <span className="text-white font-mono text-xs">{slide.name}</span>
            <span className="text-[#888] font-mono text-xs">({slide.type})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/slides')}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-mono text-xs uppercase tracking-wider transition-colors border-2 border-[#00ff00]"
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      </div>

      {/* Slide Content */}
      <div className="h-full w-full pt-12 relative">
        {renderSlide()}
      </div>
    </div>
  );
}






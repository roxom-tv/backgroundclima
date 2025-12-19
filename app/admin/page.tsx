'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Stats {
  totalSlides: number;
  activeSlides: number;
  youtubeSlides: number;
  totalSponsors: number;
  activeSponsors: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalSlides: 0,
    activeSlides: 0,
    youtubeSlides: 0,
    totalSponsors: 0,
    activeSponsors: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = getSupabaseClient();

        // Fetch slides count
        const { data: slidesData } = await supabase
          .from('slides')
          .select('id, is_active, type');

        // Fetch sponsors count
        const { data: sponsorsData } = await supabase
          .from('sponsors')
          .select('id, is_active');

        const slides = slidesData as { id: string; is_active: boolean; type: string }[] | null;
        const sponsors = sponsorsData as { id: string; is_active: boolean }[] | null;

        if (slides && sponsors) {
          setStats({
            totalSlides: slides.length,
            activeSlides: slides.filter(s => s.is_active).length,
            youtubeSlides: slides.filter(s => s.type === 'youtube').length,
            totalSponsors: sponsors.length,
            activeSponsors: sponsors.filter(s => s.is_active).length,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    subtitle?: string; 
    icon: string; 
    color: string;
  }) => (
    <div className={`bg-[#0a0a0a] p-4 border-2 ${color} border-l-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#888] text-xs font-mono uppercase tracking-wider mb-1">{title}</p>
          <p className="text-4xl font-mono font-bold text-white">
            {isLoading ? '---' : value}
          </p>
          {subtitle && (
            <p className="text-[#666] text-xs font-mono mt-1">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl opacity-50">{icon}</span>
      </div>
    </div>
  );

  const QuickAction = ({ 
    href, 
    title, 
    description, 
    icon 
  }: { 
    href: string; 
    title: string; 
    description: string; 
    icon: string;
  }) => (
    <Link
      href={href}
      className="bg-[#0a0a0a] hover:bg-[#1a1a1a] p-4 block transition-colors border-2 border-[#00ff00] hover:border-[#00cc00]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl opacity-70">{icon}</span>
        <div>
          <h3 className="text-white font-mono font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <p className="text-[#888] text-xs font-mono mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-[#00ff00] pb-3">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">DASHBOARD</h1>
        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
          SYSTEM STATUS & QUICK ACCESS
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Slides"
          value={stats.totalSlides}
          subtitle={`${stats.activeSlides} active`}
          icon="🎬"
          color="border-[#00ff00]"
        />
        <StatCard
          title="YouTube Streams"
          value={stats.youtubeSlides}
          subtitle="Live city feeds"
          icon="📺"
          color="border-[#ff0000]"
        />
        <StatCard
          title="Sponsors"
          value={stats.totalSponsors}
          subtitle={`${stats.activeSponsors} active`}
          icon="💼"
          color="border-[#00ff00]"
        />
        <StatCard
          title="Active Now"
          value={stats.activeSlides}
          subtitle="In rotation"
          icon="✅"
          color="border-[#ffff00]"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-mono font-semibold text-white mb-3 uppercase tracking-wider border-b border-[#1a1a1a] pb-2">QUICK ACTIONS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            href="/admin/slides"
            title="Manage Slides"
            description="Add, edit, or reorder display slides"
            icon="🎬"
          />
          <QuickAction
            href="/admin/sponsors"
            title="Manage Sponsors"
            description="Add or edit sponsor logos"
            icon="💼"
          />
          <QuickAction
            href="/admin/settings"
            title="Global Settings"
            description="Configure display options"
            icon="⚙️"
          />
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
        <h2 className="text-sm font-mono font-semibold text-white mb-3 uppercase tracking-wider">SYSTEM GUIDE</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-2 border-[#00ff00] pl-3">
            <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">1. CONFIGURE SLIDES</h3>
            <p className="text-[#888] text-xs font-mono">
              Go to Slides to add YouTube live streams from cities around the world. 
              You can set the duration, enable/disable weather display, and reorder them.
            </p>
          </div>
          <div className="border-l-2 border-[#00ff00] pl-3">
            <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">2. ADD SPONSORS</h3>
            <p className="text-[#888] text-xs font-mono">
              Add your sponsors with their logos. They&apos;ll be displayed on the 
              &quot;Presented by&quot; section of the display.
            </p>
          </div>
          <div className="border-l-2 border-[#00ff00] pl-3">
            <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">3. ADJUST SETTINGS</h3>
            <p className="text-[#888] text-xs font-mono">
              Configure global options like showing the LIVE indicator, 
              sponsors, and transition effects.
            </p>
          </div>
          <div className="border-l-2 border-[#00ff00] pl-3">
            <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">4. VIEW DISPLAY</h3>
            <p className="text-[#888] text-xs font-mono">
              Open the main page (/) in a browser or TV display. 
              Changes you make here will appear in real-time!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



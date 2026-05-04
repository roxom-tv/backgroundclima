'use client';

import { useEffect, useState } from 'react';
import { StatCard, QuickAction, PageHeader, InfoBox } from './components/ui';

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
                const [slidesResponse, sponsorsResponse] = await Promise.all([
                    fetch('/api/admin/slides', { cache: 'no-store' }),
                    fetch('/api/admin/sponsors', { cache: 'no-store' }),
                ]);
                const [slidesResult, sponsorsResult] = await Promise.all([
                    slidesResponse.json(),
                    sponsorsResponse.json(),
                ]);

                if (!slidesResponse.ok || !slidesResult.success) {
                    throw new Error(slidesResult.error ?? 'Failed to fetch slides stats');
                }
                if (!sponsorsResponse.ok || !sponsorsResult.success) {
                    throw new Error(sponsorsResult.error ?? 'Failed to fetch sponsors stats');
                }

                const slides = slidesResult.data as
                    | { id: string; is_active: boolean; type: string }[]
                    | null;
                const sponsors = sponsorsResult.data as { id: string; is_active: boolean }[] | null;

                if (slides && sponsors) {
                    setStats({
                        totalSlides: slides.length,
                        activeSlides: slides.filter((s) => s.is_active).length,
                        youtubeSlides: slides.filter((s) => s.type === 'youtube').length,
                        totalSponsors: sponsors.length,
                        activeSponsors: sponsors.filter((s) => s.is_active).length,
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

    return (
        <div className="space-y-6">
            <PageHeader title="DASHBOARD" subtitle="SYSTEM STATUS & QUICK ACCESS" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    title="Total Slides"
                    value={stats.totalSlides}
                    subtitle={`${stats.activeSlides} active`}
                    icon="🎬"
                    color="green"
                    isLoading={isLoading}
                />
                <StatCard
                    title="YouTube Streams"
                    value={stats.youtubeSlides}
                    subtitle="Live city feeds"
                    icon="📺"
                    color="red"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Sponsors"
                    value={stats.totalSponsors}
                    subtitle={`${stats.activeSponsors} active`}
                    icon="💼"
                    color="green"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Active Now"
                    value={stats.activeSlides}
                    subtitle="In rotation"
                    icon="✅"
                    color="yellow"
                    isLoading={isLoading}
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-mono font-semibold text-white mb-3 uppercase tracking-wider border-b border-[#1a1a1a] pb-2">
                    QUICK ACTIONS
                </h2>
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
            <InfoBox title="SYSTEM GUIDE" icon="">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="border-l-2 border-[#00ff00] pl-3">
                        <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">
                            1. CONFIGURE SLIDES
                        </h3>
                        <p className="text-[#888] text-xs font-mono normal-case">
                            Go to Slides to add YouTube live streams from cities around the world.
                            You can set the duration, enable/disable weather display, and reorder
                            them.
                        </p>
                    </div>
                    <div className="border-l-2 border-[#00ff00] pl-3">
                        <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">
                            2. ADD SPONSORS
                        </h3>
                        <p className="text-[#888] text-xs font-mono normal-case">
                            Add your sponsors with their logos. They&apos;ll be displayed on the
                            &quot;Presented by&quot; section of the display.
                        </p>
                    </div>
                    <div className="border-l-2 border-[#00ff00] pl-3">
                        <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">
                            3. ADJUST SETTINGS
                        </h3>
                        <p className="text-[#888] text-xs font-mono normal-case">
                            Configure global options like showing the LIVE indicator, sponsors, and
                            transition effects.
                        </p>
                    </div>
                    <div className="border-l-2 border-[#00ff00] pl-3">
                        <h3 className="text-white font-mono font-medium text-xs mb-1 uppercase tracking-wider">
                            4. VIEW DISPLAY
                        </h3>
                        <p className="text-[#888] text-xs font-mono normal-case">
                            Open the main page (/) in a browser or TV display. Changes you make here
                            will appear in real-time!
                        </p>
                    </div>
                </div>
            </InfoBox>
        </div>
    );
}

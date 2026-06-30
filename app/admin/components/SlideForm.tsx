'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import Image from 'next/image';
import type {
    Slide,
    SlideInsert,
    SlideType,
    Sponsor,
    CalendarEvent,
    LayoutOrientation,
    EventSlideStyle,
} from '@/lib/types/admin';
import { convertYouTubeUrlToEmbed, convertEmbedUrlToSimple } from '@/lib/youtube-utils';

interface SlideFormProps {
    slide?: Slide | null;
    onSubmit: (data: SlideInsert) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

const SLIDE_TYPES: { value: SlideType; label: string; icon: string; description: string }[] = [
    { value: 'youtube', label: 'YouTube', icon: '📺', description: 'Live stream from YouTube' },
    { value: 'show', label: 'Show', icon: '🎬', description: 'TV show with image & schedule' },
    { value: 'event', label: 'Event', icon: '📅', description: 'Event with date & details' },
    { value: 'news', label: 'News', icon: '📰', description: 'News with image, headline & source' },
    {
        value: 'video',
        label: 'Video',
        icon: '🎥',
        description: 'Video playback (1920x1080, no sound)',
    },
    {
        value: 'strc',
        label: 'STRC',
        icon: '📊',
        description: 'STRC dashboard (price, divs, sats via API)',
    },
    { value: 'sata', label: 'SATA', icon: '🛰️', description: 'SATA/Strive tracker dashboard' },
    { value: 'market', label: 'Market', icon: '📈', description: 'Market indices dashboard' },
];

const COMMON_TIMEZONES = [
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export default function SlideForm({ slide, onSubmit, onCancel, isSubmitting }: SlideFormProps) {
    const [formData, setFormData] = useState<SlideInsert>({
        type: 'youtube',
        name: '',
        country: '',
        youtube_url: '',
        weather_query: '',
        timezone: 'America/New_York',
        duration_seconds: 25,
        is_active: true,
        show_weather: true,
        show_sponsor: true,
        description: '',
        image_url: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        start_time: '',
        end_time: '',
        color: '#3B82F6',
        sponsor_id: null,
        // Multi-position sponsors
        sponsor_top_left: null,
        sponsor_top_right: null,
        sponsor_bottom_left: null,
        sponsor_bottom_right: null,
        // Show slide fields
        host_name: '',
        show_days: '',
        schedule_times: [],
        // Event slide fields
        selected_event_ids: [],
        layout_orientation: 'horizontal' as LayoutOrientation,
        event_slide_style: 'classic' as EventSlideStyle,
        event_slide_title: '',
        // News slide fields
        headline: '',
        source: '',
        // Video slide fields
        video_url: '',
        loop_count: null,
        // UTC schedule
        active_days: null,
        active_time_start: null,
        active_time_end: null,
    });

    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [availableEvents, setAvailableEvents] = useState<CalendarEvent[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch sponsors and events on mount
    useEffect(() => {
        const fetchSponsors = async () => {
            try {
                const response = await adminFetch('/api/admin/sponsors', { cache: 'no-store' });
                const result = (await response.json()) as { success: boolean; data?: Sponsor[] };

                if (response.ok && result.success && result.data) {
                    setSponsors(result.data);
                }
            } catch {
                // AdminAuthError redirects to login; other errors are silently ignored here
                // since this data is supplementary to the form
            }
        };

        const fetchEvents = async () => {
            try {
                const response = await adminFetch('/api/admin/events', { cache: 'no-store' });
                const result = (await response.json()) as {
                    success: boolean;
                    data?: CalendarEvent[];
                };

                if (response.ok && result.success && result.data) {
                    setAvailableEvents(result.data);
                }
            } catch {
                // AdminAuthError redirects to login; other errors are silently ignored here
            }
        };

        fetchSponsors();
        fetchEvents();
    }, []);

    // Populate form with slide data when editing
    useEffect(() => {
        if (slide) {
            // Convert old types
            let type = slide.type;

            if (type === 'calendar') {
                type = 'event';
            }
            if (type === 'debt') {
                type = 'show';
            }

            setFormData({
                type,
                name: slide.name,
                country: slide.country || '',
                youtube_url: slide.youtube_url ? convertEmbedUrlToSimple(slide.youtube_url) : '',
                weather_query: slide.weather_query || '',
                timezone: slide.timezone || 'America/New_York',
                duration_seconds: slide.duration_seconds,
                is_active: slide.is_active,
                show_weather: slide.show_weather,
                show_sponsor: slide.show_sponsor ?? true,
                description: slide.description || '',
                image_url: slide.image_url || '',
                start_date: slide.start_date || new Date().toISOString().split('T')[0],
                end_date: slide.end_date || '',
                start_time: slide.start_time?.slice(0, 5) || '',
                end_time: slide.end_time?.slice(0, 5) || '',
                color: slide.color || '#3B82F6',
                sponsor_id: slide.sponsor_id || null,
                // Multi-position sponsors
                sponsor_top_left: slide.sponsor_top_left || null,
                sponsor_top_right: slide.sponsor_top_right || null,
                sponsor_bottom_left: slide.sponsor_bottom_left || null,
                sponsor_bottom_right: slide.sponsor_bottom_right || null,
                // Show slide fields
                host_name: slide.host_name || '',
                show_days: slide.show_days || '',
                schedule_times: slide.schedule_times || [],
                // Event slide fields
                selected_event_ids: slide.selected_event_ids || [],
                layout_orientation: slide.layout_orientation || 'horizontal',
                event_slide_style: slide.event_slide_style || 'classic',
                event_slide_title: slide.event_slide_title || '',
                // News slide fields
                headline: slide.headline || '',
                source: slide.source || '',
                // Video slide fields
                video_url: slide.video_url || '',
                loop_count: slide.loop_count ?? null,
                // UTC schedule
                active_days: slide.active_days ?? null,
                active_time_start: slide.active_time_start ?? null,
                active_time_end: slide.active_time_end ?? null,
            });
        }
    }, [slide]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convert YouTube URL to embed format if needed
        let processedYoutubeUrl = formData.youtube_url?.trim() || null;

        if (processedYoutubeUrl && formData.type === 'youtube') {
            processedYoutubeUrl = convertYouTubeUrlToEmbed(processedYoutubeUrl);
        }

        // Clean data - remove empty strings and convert to null where appropriate
        const cleanedData: SlideInsert = {
            type: formData.type,
            // For show slides, if name is empty, use a default value for DB (required field)
            // The component will hide the overlay if only default "Show" name exists without other content
            name: formData.type === 'show' && !formData.name.trim() ? 'Show' : formData.name.trim(),
            country: formData.country?.trim() || null,
            youtube_url: processedYoutubeUrl,
            weather_query: formData.weather_query?.trim() || null,
            timezone: formData.timezone || null,
            duration_seconds: formData.duration_seconds,
            is_active: formData.is_active,
            show_weather: formData.show_weather,
            show_sponsor: formData.show_sponsor,
            description: formData.description?.trim() || null,
            image_url: formData.image_url?.trim() || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date?.trim() || null,
            start_time: formData.start_time ? `${formData.start_time}:00` : null,
            end_time: formData.end_time ? `${formData.end_time}:00` : null,
            color: formData.color || null,
            sponsor_id: formData.show_sponsor ? formData.sponsor_id || null : null,
            // Multi-position sponsors
            sponsor_top_left: formData.show_sponsor ? formData.sponsor_top_left || null : null,
            sponsor_top_right: formData.show_sponsor ? formData.sponsor_top_right || null : null,
            sponsor_bottom_left: formData.show_sponsor
                ? formData.sponsor_bottom_left || null
                : null,
            sponsor_bottom_right: formData.show_sponsor
                ? formData.sponsor_bottom_right || null
                : null,
            // Show slide fields
            host_name: formData.host_name?.trim() || null,
            show_days: formData.show_days?.trim() || null,
            schedule_times:
                formData.schedule_times && formData.schedule_times.length > 0
                    ? formData.schedule_times
                    : null,
            // Event slide fields
            selected_event_ids:
                formData.selected_event_ids && formData.selected_event_ids.length > 0
                    ? formData.selected_event_ids
                    : null,
            layout_orientation:
                formData.selected_event_ids && formData.selected_event_ids.length === 3
                    ? formData.layout_orientation
                    : null,
            event_slide_style:
                formData.type === 'event' ? formData.event_slide_style || 'classic' : null,
            event_slide_title:
                formData.type === 'event' && formData.event_slide_style === 'modern'
                    ? formData.event_slide_title?.trim() || null
                    : null,
            // News slide fields
            headline: formData.headline?.trim() || null,
            source: formData.source?.trim() || null,
            // Video slide fields
            video_url: formData.video_url?.trim() || null,
            loop_count: formData.loop_count ?? null,
            // UTC schedule
            active_days:
                formData.active_days && formData.active_days.length > 0
                    ? formData.active_days
                    : null,
            active_time_start: formData.active_time_start || null,
            active_time_end: formData.active_time_end || null,
        };

        // System data slides: no YouTube/weather/video/event fields.
        if (formData.type === 'strc' || formData.type === 'sata' || formData.type === 'market') {
            Object.assign(cleanedData, {
                country: null,
                youtube_url: null,
                weather_query: null,
                timezone: null,
                show_weather: false,
                description: null,
                image_url: null,
                start_date: null,
                end_date: null,
                start_time: null,
                end_time: null,
                host_name: null,
                show_days: null,
                schedule_times: null,
                selected_event_ids: null,
                layout_orientation: null,
                event_slide_style: null,
                event_slide_title: null,
                headline: null,
                source: null,
                video_url: null,
                loop_count: null,
            } satisfies Partial<SlideInsert>);
        }

        await onSubmit(cleanedData);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const body = new FormData();
            body.append('file', file);
            body.append('prefix', 'sponsors');

            const response = await adminFetch('/api/admin/upload', { method: 'POST', body });
            const result = (await response.json()) as {
                success: boolean;
                data?: { url: string; key: string };
                error?: string;
            };

            if (!response.ok || !result.success) {
                throw new Error(result.error ?? 'Upload failed');
            }

            setFormData((prev) => ({ ...prev, image_url: result.data!.url }));
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const isYouTube = formData.type === 'youtube';
    const isEvent = formData.type === 'event';
    const isShow = formData.type === 'show';
    const isNews = formData.type === 'news';
    const isVideo = formData.type === 'video';
    const isStrc = formData.type === 'strc';
    const isSata = formData.type === 'sata';
    const isMarket = formData.type === 'market';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Slide Type */}
            <div>
                <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
                    SLIDE TYPE
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SLIDE_TYPES.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                            className={`p-3 border-2 transition-all text-left font-mono text-xs ${
                                formData.type === type.value
                                    ? 'border-[#00ff00] bg-[#0a0a0a] text-[#00ff00]'
                                    : 'border-[#333] bg-[#1a1a1a] text-white hover:border-[#00ff00]'
                            }`}
                        >
                            <span className="text-2xl block mb-1 opacity-70">{type.icon}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider block mb-1">
                                {type.label}
                            </span>
                            <span className="text-[10px] text-[#888] uppercase tracking-wider block">
                                {type.description}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Name / Title */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                >
                    {isShow
                        ? 'SHOW TITLE'
                        : isEvent
                          ? 'EVENT TITLE'
                          : isNews
                            ? 'NEWS TITLE'
                            : isVideo
                              ? 'VIDEO TITLE'
                              : isStrc
                                ? 'STRC SLIDE NAME'
                                : isSata
                                  ? 'SATA SLIDE NAME'
                                  : isMarket
                                    ? 'MARKET SLIDE NAME'
                                    : 'NAME'}{' '}
                    {!isShow && '*'}
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isShow}
                    placeholder={
                        isShow
                            ? 'Show name (optional - image only if empty)...'
                            : isEvent
                              ? 'Event title...'
                              : isNews
                                ? 'News title...'
                                : isVideo
                                  ? 'Video title...'
                                  : isStrc
                                    ? 'e.g., STRC Dashboard'
                                    : isSata
                                      ? 'e.g., SATA Dashboard'
                                      : isMarket
                                        ? 'e.g., Market Dashboard'
                                        : 'e.g., Hong Kong'
                    }
                    className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                />
                {isShow && (
                    <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                        OPTIONAL - IF EMPTY, ONLY IMAGE WILL BE DISPLAYED
                    </p>
                )}
            </div>

            {(isStrc || isSata) && (
                <div className="bg-[#0a0a0a] border-2 border-[#00aaff] p-4 text-xs font-mono text-[#aaddff] uppercase tracking-wider space-y-2">
                    <p className="text-white font-semibold">
                        {isSata ? 'SATA DATA SOURCE' : 'STRC DATA SOURCE'}
                    </p>
                    <p>
                        THE APP CALLS{' '}
                        <code className="text-[#00ff00]">
                            {isSata ? '/api/strc/strive' : '/api/strc/data'}
                        </code>{' '}
                        (SAME DEPLOYMENT).{' '}
                        {isSata ? (
                            'SATA USES STRATEGYTRACKER DATA DIRECTLY FROM THIS PROJECT.'
                        ) : (
                            <>
                                IF YOU STILL USE AN EXTERNAL STRC SERVICE, SET{' '}
                                <code className="text-[#00ff00]">STRC_UPSTREAM_URL</code> IN VERCEL
                                OR <code className="text-[#00ff00]">.env.local</code>.
                            </>
                        )}
                    </p>
                </div>
            )}

            {isMarket && (
                <div className="bg-[#0a0a0a] border-2 border-[#00aaff] p-4 text-xs font-mono text-[#aaddff] uppercase tracking-wider space-y-2">
                    <p className="text-white font-semibold">MARKET DATA SOURCE</p>
                    <p>
                        THIS SLIDE DISPLAYS THE MARKET INDICES DASHBOARD AUTOMATICALLY. NO
                        ADDITIONAL CONFIGURATION IS REQUIRED.
                    </p>
                </div>
            )}

            {/* ========== SHOW FIELDS ========== */}
            {isShow && (
                <>
                    {/* Host Name */}
                    <div>
                        <label
                            htmlFor="host_name"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            HOST / PRESENTER NAME
                        </label>
                        <input
                            id="host_name"
                            name="host_name"
                            type="text"
                            value={formData.host_name || ''}
                            onChange={handleChange}
                            placeholder="e.g., Hank Hudson"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Background Image Upload (1920x1080) */}
                    <div>
                        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
                            BACKGROUND IMAGE (1920X1080) *
                        </label>
                        <p className="text-xs text-[#888] font-mono mb-2 uppercase tracking-wider">
                            UPLOAD IMAGE. IF NO TEXT FIELDS ARE FILLED, ONLY IMAGE WILL BE
                            DISPLAYED.
                        </p>
                        <div className="flex items-center gap-4">
                            {formData.image_url && (
                                <div className="relative w-48 h-28 overflow-hidden bg-[#1a1a1a] border-2 border-[#00ff00]">
                                    <Image
                                        src={formData.image_url}
                                        alt="Show preview"
                                        fill
                                        sizes="192px"
                                        unoptimized
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({ ...prev, image_url: '' }))
                                        }
                                        className="absolute top-1 right-1 w-5 h-5 bg-[#ff0000] border-2 border-[#ff0000] text-white text-xs flex items-center justify-center font-mono"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                    id="show-image-upload"
                                />
                                <label
                                    htmlFor="show-image-upload"
                                    className={`inline-flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors border-2 font-mono text-xs uppercase tracking-wider ${
                                        isUploading
                                            ? 'bg-[#1a1a1a] text-[#666] border-[#333]'
                                            : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-[#00ff00]'
                                    }`}
                                >
                                    {isUploading ? 'UPLOADING...' : '📷 UPLOAD IMAGE'}
                                </label>
                                {uploadError && (
                                    <p className="text-[#ff0000] text-xs font-mono mt-1 uppercase tracking-wider">
                                        {uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <input
                            name="image_url"
                            type="url"
                            value={formData.image_url || ''}
                            onChange={handleChange}
                            placeholder="Or paste image URL"
                            className="mt-2 w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Show Days */}
                    <div>
                        <label
                            htmlFor="show_days"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            SHOW DAYS
                        </label>
                        <input
                            id="show_days"
                            name="show_days"
                            type="text"
                            value={formData.show_days || ''}
                            onChange={handleChange}
                            placeholder="e.g., Monday to Friday"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Schedule Times (multiple timezones) */}
                    <div>
                        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
                            SCHEDULE TIMES (PER TIMEZONE)
                        </label>
                        <div className="space-y-2">
                            {(formData.schedule_times || []).map((scheduleItem, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={scheduleItem.time}
                                        onChange={(e) => {
                                            const newTimes = [...(formData.schedule_times || [])];
                                            newTimes[index] = {
                                                ...newTimes[index],
                                                time: e.target.value,
                                            };
                                            setFormData((prev) => ({
                                                ...prev,
                                                schedule_times: newTimes,
                                            }));
                                        }}
                                        placeholder="11:00 am"
                                        className="w-28 px-3 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                                    />
                                    <input
                                        type="text"
                                        value={scheduleItem.timezone}
                                        onChange={(e) => {
                                            const newTimes = [...(formData.schedule_times || [])];
                                            newTimes[index] = {
                                                ...newTimes[index],
                                                timezone: e.target.value,
                                            };
                                            setFormData((prev) => ({
                                                ...prev,
                                                schedule_times: newTimes,
                                            }));
                                        }}
                                        placeholder="New York"
                                        className="flex-1 px-3 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newTimes = (formData.schedule_times || []).filter(
                                                (_, i) => i !== index,
                                            );
                                            setFormData((prev) => ({
                                                ...prev,
                                                schedule_times: newTimes,
                                            }));
                                        }}
                                        className="w-8 h-8 bg-[#ff0000] hover:bg-[#cc0000] text-white border-2 border-[#ff0000] flex items-center justify-center text-xs font-mono"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    const newTimes = [
                                        ...(formData.schedule_times || []),
                                        { time: '', timezone: '' },
                                    ];
                                    setFormData((prev) => ({ ...prev, schedule_times: newTimes }));
                                }}
                                className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-2 border-[#00ff00] font-mono text-xs uppercase tracking-wider flex items-center gap-1"
                            >
                                <span>+</span> ADD TIME ZONE
                            </button>
                        </div>
                        <p className="text-xs text-[#888] font-mono mt-1 uppercase tracking-wider">
                            EXAMPLE: &quot;11:00 AM&quot; + &quot;NEW YORK&quot;, &quot;4:00
                            PM&quot; + &quot;LONDON&quot;
                        </p>
                    </div>
                </>
            )}

            {/* ========== EVENT FIELDS - Select events from database ========== */}
            {isEvent && (
                <>
                    {/* Event Selection */}
                    <div>
                        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
                            Select Events to Display (1-4)
                        </label>
                        {availableEvents.length === 0 ? (
                            <div className="bg-[#0a0a0a] border-2 border-[#ffff00] p-4 text-[#ffff00] text-xs font-mono uppercase tracking-wider border-l-4">
                                <p className="font-medium mb-1">⚠️ No events available</p>
                                <p className="text-yellow-300/80">
                                    First create events in the{' '}
                                    <a href="/admin/events" className="underline hover:text-white">
                                        Events section
                                    </a>
                                    , then come back here to select them.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto bg-[#0a0a0a] p-3 border-2 border-[#00ff00]">
                                {availableEvents.map((event) => {
                                    const isSelected = (formData.selected_event_ids || []).includes(
                                        event.id,
                                    );
                                    const canSelect =
                                        isSelected ||
                                        (formData.selected_event_ids || []).length < 4;

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                if (!canSelect && !isSelected) {
                                                    return;
                                                }

                                                const current = formData.selected_event_ids || [];
                                                const newIds = isSelected
                                                    ? current.filter((id) => id !== event.id)
                                                    : [...current, event.id];

                                                setFormData((prev) => ({
                                                    ...prev,
                                                    selected_event_ids: newIds,
                                                }));
                                            }}
                                            className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-2 font-mono text-xs ${
                                                isSelected
                                                    ? 'bg-[#1a1a1a] border-[#00ff00] hover:border-[#00cc00]'
                                                    : canSelect
                                                      ? 'bg-[#1a1a1a] border-[#333] hover:border-[#00ff00]'
                                                      : 'bg-[#0a0a0a] border-[#333] opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            {/* Checkbox indicator */}
                                            <div
                                                className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 font-mono text-xs ${
                                                    isSelected
                                                        ? 'bg-[#00ff00] text-black border-[#00ff00]'
                                                        : 'bg-[#1a1a1a] border-[#333]'
                                                }`}
                                            >
                                                {isSelected && '✓'}
                                            </div>

                                            {/* Color indicator */}
                                            <div
                                                className="w-3 h-10 flex-shrink-0 border-2 border-[#00ff00]"
                                                style={{ backgroundColor: event.color }}
                                            />

                                            {/* Event image */}
                                            {event.image_url && (
                                                <div className="w-14 h-10 overflow-hidden flex-shrink-0 bg-[#1a1a1a] border-2 border-[#00ff00]">
                                                    <Image
                                                        src={event.image_url}
                                                        alt={event.title}
                                                        width={56}
                                                        height={40}
                                                        unoptimized
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}

                                            {/* Event info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-mono text-xs font-medium truncate uppercase tracking-wider">
                                                    {event.title}
                                                </p>
                                                <p className="text-[#888] text-xs font-mono">
                                                    📅{' '}
                                                    {new Date(
                                                        event.start_date + 'T00:00:00',
                                                    ).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                    {event.start_time &&
                                                        ` • ${event.start_time.slice(0, 5)}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Selection count */}
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[#888] text-xs font-mono uppercase tracking-wider">
                                {(formData.selected_event_ids || []).length}/4 EVENTS SELECTED
                            </p>
                            {(formData.selected_event_ids || []).length > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, selected_event_ids: [] }))
                                    }
                                    className="text-[#ff0000] text-xs font-mono uppercase tracking-wider hover:text-[#cc0000]"
                                >
                                    CLEAR ALL
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Layout Preview */}
                    {(formData.selected_event_ids || []).length > 0 && (
                        <div className="bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
                            <p className="text-xs font-mono font-medium text-white uppercase tracking-wider mb-3">
                                LAYOUT PREVIEW
                            </p>
                            <div className="aspect-video bg-black border-2 border-[#00ff00] overflow-hidden p-2 max-w-xs">
                                {(formData.selected_event_ids || []).length === 1 && (
                                    <div className="w-full h-full bg-blue-600/50 rounded flex items-center justify-center text-white text-xs">
                                        Full Screen
                                    </div>
                                )}
                                {(formData.selected_event_ids || []).length === 2 && (
                                    <div className="w-full h-full grid grid-cols-2 gap-1">
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            1
                                        </div>
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            2
                                        </div>
                                    </div>
                                )}
                                {(formData.selected_event_ids || []).length === 3 && (
                                    <div
                                        className={`w-full h-full gap-1 ${
                                            formData.layout_orientation === 'horizontal'
                                                ? 'grid grid-cols-3'
                                                : 'grid grid-rows-3'
                                        }`}
                                    >
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            1
                                        </div>
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            2
                                        </div>
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            3
                                        </div>
                                    </div>
                                )}
                                {(formData.selected_event_ids || []).length === 4 && (
                                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1">
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            1
                                        </div>
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            2
                                        </div>
                                        <div className="bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center text-[#00ff00] text-xs font-mono">
                                            3
                                        </div>
                                        <div className="bg-orange-600/50 rounded flex items-center justify-center text-white text-xs">
                                            4
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Orientation selector for 3 events */}
                            {(formData.selected_event_ids || []).length === 3 && (
                                <div className="mt-3">
                                    <p className="text-xs font-mono text-[#888] mb-2 uppercase tracking-wider">
                                        LAYOUT ORIENTATION:
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    layout_orientation: 'horizontal',
                                                }))
                                            }
                                            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border-2 transition-colors ${
                                                formData.layout_orientation === 'horizontal'
                                                    ? 'bg-[#00ff00] text-black border-[#00ff00]'
                                                    : 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#00ff00]'
                                            }`}
                                        >
                                            ▭ HORIZONTAL (3 COLUMNS)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    layout_orientation: 'vertical',
                                                }))
                                            }
                                            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border-2 transition-colors ${
                                                formData.layout_orientation === 'vertical'
                                                    ? 'bg-[#00ff00] text-black border-[#00ff00]'
                                                    : 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#00ff00]'
                                            }`}
                                        >
                                            ▯ VERTICAL (3 ROWS)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Style Selector */}
                    <div className="bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
                        <p className="text-xs font-mono font-medium text-white uppercase tracking-wider mb-3">
                            SLIDE STYLE
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_slide_style: 'classic',
                                    }))
                                }
                                className={`p-4 border-2 transition-all text-left font-mono text-xs ${
                                    formData.event_slide_style === 'classic'
                                        ? 'border-[#00ff00] bg-[#1a1a1a] text-[#00ff00]'
                                        : 'border-[#333] bg-[#0a0a0a] text-white hover:border-[#00ff00]'
                                }`}
                            >
                                <span className="text-xl block mb-2">📅</span>
                                <span className="font-semibold uppercase tracking-wider block">
                                    CLASSIC
                                </span>
                                <span className="text-[10px] text-[#888] uppercase tracking-wider block mt-1">
                                    Centered badges, traditional layout
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        event_slide_style: 'modern',
                                    }))
                                }
                                className={`p-4 border-2 transition-all text-left font-mono text-xs ${
                                    formData.event_slide_style === 'modern'
                                        ? 'border-[#00ff00] bg-[#1a1a1a] text-[#00ff00]'
                                        : 'border-[#333] bg-[#0a0a0a] text-white hover:border-[#00ff00]'
                                }`}
                            >
                                <span className="text-xl block mb-2">🗓️</span>
                                <span className="font-semibold uppercase tracking-wider block">
                                    MODERN
                                </span>
                                <span className="text-[10px] text-[#888] uppercase tracking-wider block mt-1">
                                    Bitcoin Calendar style with header
                                </span>
                            </button>
                        </div>

                        {/* Custom Title for Modern Style */}
                        {formData.event_slide_style === 'modern' && (
                            <div className="mt-4">
                                <label
                                    htmlFor="event_slide_title"
                                    className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                                >
                                    CUSTOM TITLE (HEADER RIGHT)
                                </label>
                                <input
                                    id="event_slide_title"
                                    name="event_slide_title"
                                    type="text"
                                    value={formData.event_slide_title || ''}
                                    onChange={handleChange}
                                    placeholder="e.g., Bitcoin Calendar"
                                    className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                                />
                                <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                                    DISPLAYS IN TOP-RIGHT CORNER OF THE SLIDE
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ========== NEWS FIELDS ========== */}
            {isNews && (
                <>
                    {/* Background Image Upload */}
                    <div>
                        <label className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1">
                            BACKGROUND IMAGE *
                        </label>
                        <p className="text-xs text-[#888] font-mono mb-2 uppercase tracking-wider">
                            UPLOAD IMAGE FOR KEN BURNS EFFECT (RECOMMENDED: 1920X1080 OR LARGER)
                        </p>
                        <div className="flex items-center gap-4">
                            {formData.image_url && (
                                <div className="relative w-48 h-28 overflow-hidden bg-[#1a1a1a] border-2 border-[#00ff00]">
                                    <Image
                                        src={formData.image_url}
                                        alt="News preview"
                                        fill
                                        sizes="192px"
                                        unoptimized
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({ ...prev, image_url: '' }))
                                        }
                                        className="absolute top-1 right-1 w-5 h-5 bg-[#ff0000] border-2 border-[#ff0000] text-white text-xs flex items-center justify-center font-mono"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                    id="news-image-upload"
                                />
                                <label
                                    htmlFor="news-image-upload"
                                    className={`inline-flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors border-2 font-mono text-xs uppercase tracking-wider ${
                                        isUploading
                                            ? 'bg-[#1a1a1a] text-[#666] border-[#333]'
                                            : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border-[#00ff00]'
                                    }`}
                                >
                                    {isUploading ? 'UPLOADING...' : '📷 UPLOAD IMAGE'}
                                </label>
                                {uploadError && (
                                    <p className="text-[#ff0000] text-xs font-mono mt-1 uppercase tracking-wider">
                                        {uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <input
                            name="image_url"
                            type="url"
                            value={formData.image_url || ''}
                            onChange={handleChange}
                            placeholder="Or paste image URL"
                            className="mt-2 w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Headline */}
                    <div>
                        <label
                            htmlFor="headline"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            HEADLINE *
                        </label>
                        <input
                            id="headline"
                            name="headline"
                            type="text"
                            value={formData.headline || ''}
                            onChange={handleChange}
                            required
                            placeholder="Breaking news headline..."
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Source */}
                    <div>
                        <label
                            htmlFor="source"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            SOURCE
                        </label>
                        <input
                            id="source"
                            name="source"
                            type="text"
                            value={formData.source || ''}
                            onChange={handleChange}
                            placeholder="e.g., Reuters, BBC News, CNN"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label
                            htmlFor="description"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            DESCRIPTION
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            placeholder="News article description or summary..."
                            rows={4}
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>
                </>
            )}

            {/* ========== VIDEO FIELDS ========== */}
            {isVideo && (
                <>
                    {/* Video URL */}
                    <div>
                        <label
                            htmlFor="video_url"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            VIDEO URL *
                        </label>
                        <input
                            id="video_url"
                            name="video_url"
                            type="url"
                            value={formData.video_url || ''}
                            onChange={handleChange}
                            required
                            placeholder="https://example.com/video.mp4"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                            RECOMMENDED: 1920X1080 MP4 FORMAT
                        </p>
                    </div>

                    {/* Loop Count */}
                    <div>
                        <label
                            htmlFor="loop_count"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            LOOP COUNT
                        </label>
                        <input
                            id="loop_count"
                            name="loop_count"
                            type="number"
                            min="1"
                            value={formData.loop_count ?? ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                    ...prev,
                                    loop_count: value === '' ? null : parseInt(value, 10),
                                }));
                            }}
                            placeholder="Leave empty for infinite loop"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                            EMPTY = INFINITE LOOP | 1 = PLAY ONCE (ADVANCES TO NEXT SLIDE WHEN DONE)
                            | 2+ = REPEAT N TIMES
                        </p>
                    </div>
                </>
            )}

            {/* ========== YOUTUBE FIELDS ========== */}
            {isYouTube && (
                <>
                    <div>
                        <label
                            htmlFor="country"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            COUNTRY
                        </label>
                        <input
                            id="country"
                            name="country"
                            type="text"
                            value={formData.country || ''}
                            onChange={handleChange}
                            placeholder="e.g., Hong Kong"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="youtube_url"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            YOUTUBE URL *
                        </label>
                        <input
                            id="youtube_url"
                            name="youtube_url"
                            type="text"
                            value={formData.youtube_url || ''}
                            onChange={handleChange}
                            required
                            placeholder="https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                        <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                            ANY YOUTUBE URL FORMAT (WILL BE CONVERTED TO EMBED AUTOMATICALLY)
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="weather_query"
                            className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                        >
                            WEATHER QUERY
                        </label>
                        <input
                            id="weather_query"
                            name="weather_query"
                            type="text"
                            value={formData.weather_query || ''}
                            onChange={handleChange}
                            placeholder="e.g., Hong Kong,HK"
                            className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white placeholder-[#666] font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                        />
                    </div>
                </>
            )}

            {/* Timezone (for YouTube, Event, Show) */}
            {(isYouTube || isEvent || isShow) && (
                <div>
                    <label
                        htmlFor="timezone"
                        className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                    >
                        TIMEZONE
                    </label>
                    <select
                        id="timezone"
                        name="timezone"
                        value={formData.timezone || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                    >
                        <option value="">SELECT TIMEZONE...</option>
                        {COMMON_TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                                {tz.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Duration */}
            <div>
                <label
                    htmlFor="duration_seconds"
                    className="block text-xs font-mono font-medium text-white uppercase tracking-wider mb-1"
                >
                    DURATION (SECONDS)
                </label>
                <input
                    id="duration_seconds"
                    name="duration_seconds"
                    type="number"
                    min={5}
                    max={300}
                    value={formData.duration_seconds}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border-2 border-[#00ff00] text-white font-mono text-xs focus:outline-none focus:border-[#00cc00]"
                />
                <p className="text-[#888] text-xs font-mono mt-1 uppercase tracking-wider">
                    HOW LONG THIS SLIDE WILL BE DISPLAYED
                </p>
            </div>

            {/* Display Options */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 border-2 border-[#00ff00]">
                <p className="text-xs font-mono font-medium text-white uppercase tracking-wider mb-2">
                    DISPLAY OPTIONS
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
                    />
                    <div>
                        <span className="text-white font-mono text-xs uppercase tracking-wider">
                            ACTIVE
                        </span>
                        <p className="text-xs text-[#888] font-mono uppercase tracking-wider">
                            INCLUDE THIS SLIDE IN ROTATION
                        </p>
                    </div>
                </label>

                {/* UTC Schedule */}
                <div className="border-t border-[#1a1a1a] pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-white font-mono text-xs uppercase tracking-wider">
                                UTC SCHEDULE
                            </span>
                            <p className="text-xs text-[#888] font-mono uppercase tracking-wider">
                                RESTRICT SLIDE TO SPECIFIC DAYS / HOURS (UTC)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const hasSchedule =
                                    formData.active_days !== null ||
                                    formData.active_time_start !== null;

                                if (hasSchedule) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        active_days: null,
                                        active_time_start: null,
                                        active_time_end: null,
                                    }));
                                } else {
                                    setFormData((prev) => ({
                                        ...prev,
                                        active_days: [],
                                        active_time_start: '',
                                        active_time_end: '',
                                    }));
                                }
                            }}
                            className={`px-3 py-1 font-mono text-xs uppercase tracking-wider border-2 transition-all ${
                                formData.active_days !== null || formData.active_time_start !== null
                                    ? 'border-[#00aaff] bg-[#0a1a2a] text-[#00aaff]'
                                    : 'border-[#333] bg-[#1a1a1a] text-[#666] hover:border-[#00aaff] hover:text-[#00aaff]'
                            }`}
                        >
                            {formData.active_days !== null || formData.active_time_start !== null
                                ? 'ENABLED ✓'
                                : 'ENABLE'}
                        </button>
                    </div>

                    {(formData.active_days !== null || formData.active_time_start !== null) && (
                        <div className="space-y-4 p-3 bg-[#0a1a2a] border border-[#00aaff]/30">
                            {/* Day selector */}
                            <div>
                                <p className="text-[10px] font-mono text-[#00aaff] uppercase tracking-wider mb-2">
                                    ACTIVE DAYS (LEAVE ALL UNCHECKED = EVERY DAY)
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
                                        const active = (formData.active_days ?? []).includes(
                                            day.value,
                                        );

                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.active_days ?? [];
                                                    const next = active
                                                        ? current.filter((d) => d !== day.value)
                                                        : [...current, day.value].sort(
                                                              (a, b) => a - b,
                                                          );
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        active_days: next,
                                                    }));
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
                                    ACTIVE HOURS UTC (LEAVE EMPTY = ALL DAY)
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-mono text-[#555] uppercase tracking-wider">
                                            FROM
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.active_time_start ?? ''}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    active_time_start: e.target.value || null,
                                                }))
                                            }
                                            className="px-2 py-1 bg-[#111] border border-[#00aaff]/50 text-white font-mono text-xs focus:outline-none focus:border-[#00aaff]"
                                        />
                                    </div>
                                    <span className="text-[#00aaff] font-mono text-xs mt-4">→</span>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-mono text-[#555] uppercase tracking-wider">
                                            TO
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.active_time_end ?? ''}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    active_time_end: e.target.value || null,
                                                }))
                                            }
                                            className="px-2 py-1 bg-[#111] border border-[#00aaff]/50 text-white font-mono text-xs focus:outline-none focus:border-[#00aaff]"
                                        />
                                    </div>
                                    <span className="text-[#555] font-mono text-[9px] uppercase tracking-wider mt-4">
                                        UTC
                                    </span>
                                </div>
                                {formData.active_time_start &&
                                    formData.active_time_end &&
                                    formData.active_time_start >= formData.active_time_end && (
                                        <p className="text-[10px] font-mono text-[#ffaa00] mt-1 uppercase tracking-wider">
                                            ⚠ CROSSES MIDNIGHT (E.G. 22:00 → 06:00)
                                        </p>
                                    )}
                            </div>
                        </div>
                    )}
                </div>

                {isYouTube && (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="show_weather"
                            checked={formData.show_weather}
                            onChange={handleChange}
                            className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
                        />
                        <div>
                            <span className="text-white font-mono text-xs uppercase tracking-wider">
                                SHOW WEATHER
                            </span>
                            <p className="text-xs text-[#888] font-mono uppercase tracking-wider">
                                DISPLAY TEMPERATURE AND CONDITIONS
                            </p>
                        </div>
                    </label>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        name="show_sponsor"
                        checked={formData.show_sponsor}
                        onChange={handleChange}
                        className="w-5 h-5 bg-[#1a1a1a] border-2 border-[#00ff00] text-[#00ff00] focus:ring-[#00ff00]"
                    />
                    <div>
                        <span className="text-white font-mono text-xs uppercase tracking-wider">
                            SHOW SPONSOR
                        </span>
                        <p className="text-xs text-[#888] font-mono uppercase tracking-wider">
                            DISPLAY SPONSOR LOGO ON THIS SLIDE
                        </p>
                    </div>
                </label>

                {/* Multi-Position Sponsor Selectors */}
                {formData.show_sponsor && sponsors.length > 0 && (
                    <div className="mt-4 p-4 bg-[#0a0a0a] border-2 border-[#00ff00]">
                        <p className="text-xs font-mono font-medium text-white uppercase tracking-wider mb-3">
                            SPONSOR POSITIONS
                        </p>
                        <p className="text-[#888] text-xs font-mono mb-4 uppercase tracking-wider">
                            SELECT A SPONSOR FOR EACH CORNER (LEAVE EMPTY TO HIDE)
                        </p>

                        {/* Visual Grid */}
                        <div className="grid grid-cols-2 gap-3 max-w-md">
                            {/* Top Left */}
                            <div>
                                <label className="block text-[10px] font-mono text-[#888] mb-1 uppercase tracking-wider">
                                    ↖ TOP LEFT
                                </label>
                                <select
                                    name="sponsor_top_left"
                                    value={formData.sponsor_top_left || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-[#1a1a1a] border-2 border-[#333] text-white font-mono text-xs focus:outline-none focus:border-[#00ff00]"
                                >
                                    <option value="">None</option>
                                    {sponsors.map((sponsor) => (
                                        <option key={sponsor.id} value={sponsor.id}>
                                            {sponsor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Top Right */}
                            <div>
                                <label className="block text-[10px] font-mono text-[#888] mb-1 uppercase tracking-wider">
                                    TOP RIGHT ↗
                                </label>
                                <select
                                    name="sponsor_top_right"
                                    value={formData.sponsor_top_right || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-[#1a1a1a] border-2 border-[#333] text-white font-mono text-xs focus:outline-none focus:border-[#00ff00]"
                                >
                                    <option value="">None</option>
                                    {sponsors.map((sponsor) => (
                                        <option key={sponsor.id} value={sponsor.id}>
                                            {sponsor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Bottom Left */}
                            <div>
                                <label className="block text-[10px] font-mono text-[#888] mb-1 uppercase tracking-wider">
                                    ↙ BOTTOM LEFT
                                </label>
                                <select
                                    name="sponsor_bottom_left"
                                    value={formData.sponsor_bottom_left || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-[#1a1a1a] border-2 border-[#333] text-white font-mono text-xs focus:outline-none focus:border-[#00ff00]"
                                >
                                    <option value="">None</option>
                                    {sponsors.map((sponsor) => (
                                        <option key={sponsor.id} value={sponsor.id}>
                                            {sponsor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Bottom Right */}
                            <div>
                                <label className="block text-[10px] font-mono text-[#888] mb-1 uppercase tracking-wider">
                                    BOTTOM RIGHT ↘
                                </label>
                                <select
                                    name="sponsor_bottom_right"
                                    value={formData.sponsor_bottom_right || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-[#1a1a1a] border-2 border-[#333] text-white font-mono text-xs focus:outline-none focus:border-[#00ff00]"
                                >
                                    <option value="">None</option>
                                    {sponsors.map((sponsor) => (
                                        <option key={sponsor.id} value={sponsor.id}>
                                            {sponsor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Visual Preview */}
                        <div className="mt-4 p-2 bg-black border border-[#333] aspect-video max-w-xs relative">
                            <div className="absolute top-1 left-1 text-[8px] font-mono text-[#00ff00] px-1 bg-black/80">
                                {formData.sponsor_top_left
                                    ? sponsors
                                          .find((s) => s.id === formData.sponsor_top_left)
                                          ?.name?.slice(0, 10)
                                    : '—'}
                            </div>
                            <div className="absolute top-1 right-1 text-[8px] font-mono text-[#00ff00] px-1 bg-black/80">
                                {formData.sponsor_top_right
                                    ? sponsors
                                          .find((s) => s.id === formData.sponsor_top_right)
                                          ?.name?.slice(0, 10)
                                    : '—'}
                            </div>
                            <div className="absolute bottom-1 left-1 text-[8px] font-mono text-[#00ff00] px-1 bg-black/80">
                                {formData.sponsor_bottom_left
                                    ? sponsors
                                          .find((s) => s.id === formData.sponsor_bottom_left)
                                          ?.name?.slice(0, 10)
                                    : '—'}
                            </div>
                            <div className="absolute bottom-1 right-1 text-[8px] font-mono text-[#00ff00] px-1 bg-black/80">
                                {formData.sponsor_bottom_right
                                    ? sponsors
                                          .find((s) => s.id === formData.sponsor_bottom_right)
                                          ?.name?.slice(0, 10)
                                    : '—'}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-[#333] text-xs font-mono">
                                SLIDE PREVIEW
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t-2 border-[#1a1a1a]">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-mono text-xs uppercase tracking-wider disabled:opacity-50 border-2 border-[#333]"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-4 py-2 bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 border-2 border-[#00ff00]"
                >
                    {isSubmitting ? 'SAVING...' : slide ? 'UPDATE SLIDE' : 'CREATE SLIDE'}
                </button>
            </div>
        </form>
    );
}

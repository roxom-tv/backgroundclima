'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '@/lib/supabase/types';
import { convertYouTubeUrlToEmbed } from '@/lib/youtube-utils';
import { HlsVideo } from './HlsVideo';

const EarthAnimation = dynamic(() => import('./EarthHero/EarthAnimation'), {
    ssr: false,
    loading: () => null,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveCamera {
    location: string;
    display_name: string;
    youtube_url: string;
    stream_url: string;
}

interface Coords { lat: number; lon: number; }

interface ResolvedLiveCamera extends LiveCamera {
    coords: Coords | null;
    embedUrl: string | null;
    pipSrc: string | null;
    isDirectVideo: boolean;
    countryCode: string | null;
}

type Phase = 'globe' | 'zooming_in' | 'pip';

/** Convert ISO 3166-1 alpha-2 country code to flag emoji. */
function countryFlag(code: string | null): string {
    if (!code || code.length !== 2) return '';
    const base = 0x1F1E6;
    return String.fromCodePoint(
        code.toUpperCase().charCodeAt(0) - 65 + base,
        code.toUpperCase().charCodeAt(1) - 65 + base,
    );
}

function buildEmbedUrl(rawUrl: string): string {
    const base = convertYouTubeUrlToEmbed(rawUrl);
    try {
        const u = new URL(base);
        u.searchParams.set('mute', '1');
        u.searchParams.set('controls', '0');
        u.searchParams.set('autoplay', '1');
        u.searchParams.set('modestbranding', '1');
        u.searchParams.set('rel', '0');
        return u.toString();
    } catch { return base; }
}

function parseCamera(slide: Slide): LiveCamera {
    // Try JSON in description (single-entry array or object)
    if (slide.description) {
        try {
            const parsed = JSON.parse(slide.description);
            const entry = Array.isArray(parsed) ? parsed[0] : parsed;
            if (entry?.location || entry?.youtube_url || entry?.stream_url) {
                return {
                    location:     entry.location     ?? '',
                    display_name: entry.display_name ?? '',
                    youtube_url:  entry.youtube_url  ?? '',
                    stream_url:   entry.stream_url   ?? '',
                };
            }
        } catch { /* fall through */ }
    }
    return {
        location:     slide.weather_query ?? '',
        display_name: '',
        youtube_url:  slide.youtube_url   ?? '',
        stream_url:   '',
    };
}

async function geocode(location: string): Promise<{ lat: number; lon: number; countryCode: string | null } | null> {
    if (!location.trim()) return null;
    try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(location.trim())}`);
        const d: { lat?: number; lon?: number; countryCode?: string | null } = await r.json();
        if (d.lat !== undefined && d.lon !== undefined)
            return { lat: d.lat, lon: d.lon, countryCode: d.countryCode ?? null };
    } catch { /* ignore */ }
    return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_IN_DURATION_MS = 3_500;
const FACE_WAIT_MS        = 3_000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EarthCamLiveSlide({ slide }: { slide: Slide }) {
    const raw = parseCamera(slide);
    const embedUrl      = raw.youtube_url ? buildEmbedUrl(raw.youtube_url) : null;
    const isDirectVideo = !raw.youtube_url && !!raw.stream_url;
    const pipSrc        = isDirectVideo ? raw.stream_url : embedUrl;

    const [cam, setCam] = useState<ResolvedLiveCamera>({
        ...raw, coords: null, embedUrl, pipSrc, isDirectVideo, countryCode: null,
    });

    const [phase, setPhase]           = useState<Phase>('globe');
    const [showLabel, setShowLabel]   = useState(false);
    const [trackTarget, setTrackTarget] = useState(false);

    const phaseRef       = useRef<Phase>('globe');
    const timer1         = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timer2         = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trackDelayRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const zoomFiredRef   = useRef(false);

    const updatePhase = useCallback((next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    // Geocode on mount
    useEffect(() => {
        if (!raw.location) return;
        geocode(raw.location).then((result) => {
            if (!result) return;
            setCam((prev) => ({
                ...prev,
                coords: { lat: result.lat, lon: result.lon },
                countryCode: result.countryCode,
            }));
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Delay tracking so globe visibly rotates even if already near target
    useEffect(() => {
        if (phase !== 'globe') return;
        setTrackTarget(false);
        trackDelayRef.current = setTimeout(() => setTrackTarget(true), 800);
        return () => { if (trackDelayRef.current) clearTimeout(trackDelayRef.current); };
    }, [phase]);

    const handleFacingTarget = useCallback(() => {
        if (phaseRef.current !== 'globe') return;
        setShowLabel(true);
        timer1.current = setTimeout(() => {
            if (phaseRef.current !== 'globe') return;
            if (zoomFiredRef.current) return;
            zoomFiredRef.current = true;
            setShowLabel(false);
            updatePhase('zooming_in');
            // Open PiP 2s before zoom ends so it arrives fully open
            timer2.current = setTimeout(() => {
                if (phaseRef.current === 'zooming_in') updatePhase('pip');
            }, ZOOM_IN_DURATION_MS - 2000);
        }, FACE_WAIT_MS);
    }, [updatePhase]);

    // Cleanup
    useEffect(() => () => {
        if (timer1.current)       clearTimeout(timer1.current);
        if (timer2.current)       clearTimeout(timer2.current);
        if (trackDelayRef.current) clearTimeout(trackDelayRef.current);
    }, []);

    const showPip     = phase === 'pip';
    const showWarp    = phase === 'zooming_in';
    const globeScale  = phase === 'zooming_in' || phase === 'pip' ? 5 : 1;
    const isGlobePhase = phase === 'globe' && trackTarget;

    const dotYPercent = cam.coords
        ? Math.max(8, Math.min(88, 47 - Math.sin((cam.coords.lat * 1.06 * Math.PI) / 180) * 44))
        : 47;
    const zoomOrigin = `50% ${dotYPercent.toFixed(1)}%`;

    return (
        <div
            className="bg-black overflow-hidden"
            style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh' }}
        >
            {/* Globe */}
            <motion.div
                className="pointer-events-none"
                style={{
                    position: 'absolute', inset: 0,
                    width: '100vw', height: '100vh',
                    transformOrigin: zoomOrigin,
                    zIndex: 1,
                }}
                animate={{ scale: globeScale }}
                transition={
                    phase === 'zooming_in'
                        ? { duration: 3.5, ease: [0.4, 0, 0.15, 1] }
                        : { duration: 0 }
                }
            >
                <EarthAnimation
                    scrollY={0}
                    targetLat={isGlobePhase ? cam.coords?.lat : undefined}
                    targetLon={isGlobePhase ? cam.coords?.lon : undefined}
                    onFacingTarget={isGlobePhase ? handleFacingTarget : undefined}
                    markerCoords={cam.coords ? [{ lat: cam.coords.lat, lon: cam.coords.lon }] : undefined}
                    frozen={phase === 'pip'}
                />
            </motion.div>

            {/* Star warp during zoom-in */}
            <AnimatePresence>
                {showWarp && (
                    <motion.div
                        key="warp"
                        className="pointer-events-none absolute"
                        style={{ inset: 0, zIndex: 5, position: 'absolute' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <StarWarpCanvas duration={ZOOM_IN_DURATION_MS} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Location label */}
            <AnimatePresence>
                {showLabel && (
                    <motion.div
                        key="label"
                        className="pointer-events-none absolute whitespace-nowrap"
                        style={{
                            left: 'calc(50% + 22px)',
                            top: `${dotYPercent.toFixed(1)}%`,
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                        }}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div style={{
                            background: 'rgba(0,0,0,0.72)',
                            border: '1px solid rgba(26,231,132,0.55)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            color: '#1ae784',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            backdropFilter: 'blur(4px)',
                        }}>
                            {countryFlag(cam.countryCode)}{cam.countryCode ? ' ' : ''}{cam.display_name || cam.location}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PiP — permanent, no close timer */}
            {cam.pipSrc && (
                <motion.div
                    key="pip"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 100 }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: showPip ? 1 : 0, scale: showPip ? 1 : 0 }}
                    transition={showPip
                        ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                        : { duration: 0 }}
                >
                    <div style={{
                        width: '72vw',
                        aspectRatio: '16/9',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 0 0 2px rgba(26,231,132,0.4), 0 40px 100px rgba(0,0,0,0.8)',
                    }}>
                        {cam.isDirectVideo ? (
                            <HlsVideo
                                src={cam.pipSrc}
                                style={{
                                    position: 'absolute', top: 0, left: 0,
                                    width: '100%', height: '100%',
                                    objectFit: 'cover', border: 'none', display: 'block',
                                }}
                            />
                        ) : (
                            <iframe
                                src={cam.embedUrl ?? undefined}
                                style={{
                                    position: 'absolute',
                                    top: '-8%', left: '-8%',
                                    width: '116%', height: '116%',
                                    border: 'none', display: 'block',
                                }}
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                        {/* City badge */}
                        <div style={{
                            position: 'absolute', top: '12px', left: '12px',
                            background: 'rgba(0,0,0,0.72)',
                            border: '1px solid rgba(26,231,132,0.6)',
                            borderRadius: '8px', padding: '6px 14px',
                            color: '#1ae784', fontFamily: 'monospace',
                            fontSize: '21px', fontWeight: 600,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            backdropFilter: 'blur(6px)', zIndex: 10,
                            pointerEvents: 'none',
                        }}>
                            {countryFlag(cam.countryCode)}{cam.countryCode ? ' ' : ''}{cam.display_name || cam.location}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ─── Minimal warp canvas (same logic, shared inline) ─────────────────────────

interface WarpStreak { angle: number; speedMul: number; offset: number; width: number; bright: boolean; green: boolean; }

const STREAKS: WarpStreak[] = Array.from({ length: 180 }, (_, i) => {
    const rng = (s: number) => { const x = Math.sin(s + 1) * 43758.5453123; return x - Math.floor(x); };
    return {
        angle: (i / 180) * Math.PI * 2 + (rng(i * 3) - 0.5) * 0.12,
        speedMul: 0.6 + rng(i * 7) * 1.4,
        offset: rng(i * 11) * 0.12,
        width: 0.5 + rng(i * 13) * 1.8,
        bright: rng(i * 17) > 0.72,
        green: rng(i * 19) > 0.80,
    };
});

function StarWarpCanvas({ duration }: { duration: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = window.innerWidth, H = window.innerHeight;
        canvas.width = W; canvas.height = H;
        const cx = W / 2, cy = H / 2;
        const maxR = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2) * 1.1;
        const t0 = performance.now();
        let raf: number;
        const draw = (now: number) => {
            const raw = Math.min((now - t0) / duration, 1);
            ctx.clearRect(0, 0, W, H);
            const env = raw < 0.08 ? raw / 0.08 : raw > 0.88 ? 1 - (raw - 0.88) / 0.12 : 1;
            for (const s of STREAKS) {
                const p = Math.max(0, raw - s.offset);
                const e = p * p * s.speedMul;
                const tip = e * maxR;
                const trail = Math.max(0, tip - maxR * (0.12 + raw * 0.28));
                if (tip < 1) continue;
                const tipX = cx + Math.cos(s.angle) * tip;
                const nd = Math.abs(tipX - cx) / (W * 0.5);
                const sf = Math.min(1, Math.max(0, (nd - 0.08) / 0.18));
                const rv = (Math.sin(s.angle * 127.1 + s.speedMul * 311.7) * 43758.5453) % 1;
                const alpha = (s.bright ? 0.95 : 0.45 + Math.abs(rv) * 0.35) * env * sf;
                if (alpha < 0.01) continue;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(s.angle) * trail, cy + Math.sin(s.angle) * trail);
                ctx.lineTo(cx + Math.cos(s.angle) * tip,   cy + Math.sin(s.angle) * tip);
                ctx.strokeStyle = s.green ? `rgba(26,231,132,${alpha})` : `rgba(255,255,255,${alpha})`;
                ctx.lineWidth = s.bright ? s.width * 1.6 : s.width;
                ctx.stroke();
            }
            if (raw < 1) raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

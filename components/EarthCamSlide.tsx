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

interface CameraEntry {
    location: string;
    display_name: string;
    youtube_url: string;
    stream_url: string; // direct video / HLS — alternative to youtube_url
}

interface Coords {
    lat: number;
    lon: number;
}

interface ResolvedCamera extends CameraEntry {
    coords: Coords | null;
    embedUrl: string | null;  // YouTube embed URL
    countryCode: string | null;
    /** Resolved playback source: YouTube embedUrl or direct stream_url */
    pipSrc: string | null;
    /** Whether pipSrc is a direct video (true) or YouTube iframe (false) */
    isDirectVideo: boolean;
}

/** Convert ISO 3166-1 alpha-2 country code to flag emoji (e.g. "GB" → "🇬🇧"). */
function countryFlag(code: string | null): string {
    if (!code || code.length !== 2) return '';
    const base = 0x1F1E6;
    const a = code.toUpperCase().charCodeAt(0) - 65 + base;
    const b = code.toUpperCase().charCodeAt(1) - 65 + base;
    return String.fromCodePoint(a, b);
}

type Phase = 'globe' | 'zooming_in' | 'pip' | 'zooming_out' | 'waiting';

interface EarthCamSlideProps {
    slide: Slide;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse cameras from slide.description JSON; fall back to legacy single-camera fields. */
function parseCameras(slide: Slide): CameraEntry[] {
    if (slide.description) {
        try {
            const parsed = JSON.parse(slide.description);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed as CameraEntry[];
            }
        } catch {
            // fall through to legacy
        }
    }
    // Legacy: single camera stored in weather_query + youtube_url
    if (slide.weather_query || slide.youtube_url) {
        return [{ location: slide.weather_query ?? '', display_name: '', youtube_url: slide.youtube_url ?? '', stream_url: '' }];
    }
    return [];
}

function buildPipEmbedUrl(rawUrl: string): string {
    const base = convertYouTubeUrlToEmbed(rawUrl);
    try {
        const u = new URL(base);
        u.searchParams.set('mute', '1');
        u.searchParams.set('controls', '0');
        u.searchParams.set('autoplay', '1');
        u.searchParams.set('modestbranding', '1');
        u.searchParams.set('rel', '0');
        return u.toString();
    } catch {
        return base;
    }
}

async function geocode(location: string): Promise<{ lat: number; lon: number; countryCode: string | null } | null> {
    if (!location.trim()) return null;
    try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(location.trim())}`);
        const data: { lat?: number; lon?: number; countryCode?: string | null } = await r.json();
        if (data.lat !== undefined && data.lon !== undefined) {
            return { lat: data.lat, lon: data.lon, countryCode: data.countryCode ?? null };
        }
    } catch {
        // ignore
    }
    return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PIP_DURATION_MS = 15_000;
const ZOOM_OUT_WAIT_MS = 2_000;
const FACE_WAIT_MS = 3_000;
const ZOOM_IN_DURATION_MS = 3_500;
const ZOOM_OUT_DURATION_MS = 2_000;

// ─── Star Warp Effect ─────────────────────────────────────────────────────────

interface WarpStreak {
    angle: number;
    speedMul: number;
    offset: number;
    width: number;
    bright: boolean;
    green: boolean;
}

function buildStreaks(count: number): WarpStreak[] {
    // Deterministic pseudo-random so it's stable across renders
    const rng = (seed: number) => {
        let x = Math.sin(seed + 1) * 43758.5453123;
        return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => ({
        angle:    (i / count) * Math.PI * 2 + (rng(i * 3) - 0.5) * 0.12,
        speedMul: 0.6 + rng(i * 7) * 1.4,
        offset:   rng(i * 11) * 0.12,
        width:    0.5 + rng(i * 13) * 1.8,
        bright:   rng(i * 17) > 0.72,
        green:    rng(i * 19) > 0.80,
    }));
}

const WARP_STREAKS = buildStreaks(180);

function StarWarpEffect({ duration, reverse = false }: { duration: number; reverse?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas.width  = W;
        canvas.height = H;

        const cx = W / 2;
        const cy = H / 2;
        const maxR = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2) * 1.1;

        const startTime = performance.now();
        let rafId: number;

        const draw = (now: number) => {
            const raw = Math.min((now - startTime) / duration, 1);
            const progress = reverse ? 1 - raw : raw;

            ctx.clearRect(0, 0, W, H);

            // Fade in/out envelope based on raw time
            const env =
                raw < 0.08 ? raw / 0.08
                : raw > 0.88 ? 1 - (raw - 0.88) / 0.12
                : 1;

            for (const s of WARP_STREAKS) {
                const p = Math.max(0, progress - s.offset);
                const eased = p * p * s.speedMul;

                const tipDist  = eased * maxR;
                const trailLen = maxR * (0.12 + progress * 0.28);
                const tailDist = Math.max(0, tipDist - trailLen);

                if (tipDist < 1) continue;

                // Soft center fade: lines closer to screen center are more transparent
                const tipX = cx + Math.cos(s.angle) * tipDist;
                const normDist = Math.abs(tipX - cx) / (W * 0.5);       // 0=center 1=edge
                const sideFade = Math.min(1, Math.max(0, (normDist - 0.08) / 0.18));

                const alpha = (s.bright ? 0.95 : 0.45 + rng3(s) * 0.35) * env * sideFade;
                if (alpha < 0.01) continue;

                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(s.angle) * tailDist, cy + Math.sin(s.angle) * tailDist);
                ctx.lineTo(cx + Math.cos(s.angle) * tipDist,  cy + Math.sin(s.angle) * tipDist);
                ctx.strokeStyle = s.green
                    ? `rgba(26,231,132,${alpha})`
                    : `rgba(255,255,255,${alpha})`;
                ctx.lineWidth = s.bright ? s.width * 1.6 : s.width;
                ctx.stroke();
            }

            if (raw < 1) rafId = requestAnimationFrame(draw);
        };

        rafId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, reverse]);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
    );
}

// tiny deterministic float for per-streak opacity variation
function rng3(s: WarpStreak) {
    const x = Math.sin(s.angle * 127.1 + s.speedMul * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export default function EarthCamSlide({ slide }: EarthCamSlideProps) {
    const rawCameras = parseCameras(slide);

    const [cameras, setCameras] = useState<ResolvedCamera[]>(
        rawCameras.map((c) => {
            const embedUrl = c.youtube_url ? buildPipEmbedUrl(c.youtube_url) : null;
            const isDirectVideo = !c.youtube_url && !!c.stream_url;
            const pipSrc = isDirectVideo ? c.stream_url : embedUrl;
            return { ...c, coords: null, embedUrl, countryCode: null, pipSrc, isDirectVideo };
        }),
    );

    const [phase, setPhase] = useState<Phase>('globe');
    const [cameraIndex, setCameraIndex] = useState(0);
    const [showLabel, setShowLabel] = useState(false);
    // Delay before the globe starts tracking the target so it always visibly rotates
    const [trackTarget, setTrackTarget] = useState(false);

    const phaseRef = useRef<Phase>('globe');
    const cameraIndexRef = useRef(0);
    const timer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timer2 = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timer3 = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updatePhase = useCallback((next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    // Geocode all cameras on mount (in parallel)
    useEffect(() => {
        if (rawCameras.length === 0) return;
        rawCameras.forEach((cam, i) => {
            geocode(cam.location).then((result) => {
                setCameras((prev) => {
                    const updated = [...prev];
                    updated[i] = {
                        ...updated[i],
                        coords: result ? { lat: result.lat, lon: result.lon } : null,
                        countryCode: result?.countryCode ?? null,
                    };
                    return updated;
                });
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // All resolved camera coords for globe markers
    const allMarkerCoords = cameras
        .map((c) => c.coords)
        .filter((c): c is Coords => c !== null);

    // Current camera
    const cam = cameras[cameraIndex] ?? null;
    const isGlobePhase = phase === 'globe' && trackTarget;

    // ── Globe facing callback ──────────────────────────────────────────────────
    const handleFacingTarget = useCallback(() => {
        if (phaseRef.current !== 'globe') return;
        setShowLabel(true);
        // After face-wait, hide label and start zoom-in
        timer1.current = setTimeout(() => {
            if (phaseRef.current !== 'globe') return;
            setShowLabel(false);
            updatePhase('zooming_in');
            // Trigger pip 1s before the zoom ends so it's fully open on landing.
            timer2.current = setTimeout(() => {
                if (phaseRef.current === 'zooming_in') updatePhase('pip');
            }, ZOOM_IN_DURATION_MS - 2000);
        }, FACE_WAIT_MS);
    }, [updatePhase]);

    // ── PiP timer: after 15s start zoom-out ───────────────────────────────────
    useEffect(() => {
        if (phase !== 'pip') return;
        timer3.current = setTimeout(() => {
            if (phaseRef.current !== 'pip') return;
            updatePhase('zooming_out');
            // Schedule waiting exactly when zoom-out animation ends
            timer2.current = setTimeout(() => {
                if (phaseRef.current === 'zooming_out') updatePhase('waiting');
            }, ZOOM_OUT_DURATION_MS);
        }, PIP_DURATION_MS);
        return () => { if (timer3.current) clearTimeout(timer3.current); };
    }, [phase, updatePhase]);

    // ── Waiting: after 2s advance to next camera ──────────────────────────────
    useEffect(() => {
        if (phase !== 'waiting') return;
        setShowLabel(false);
        timer2.current = setTimeout(() => {
            if (phaseRef.current !== 'waiting') return;
            const next = (cameraIndexRef.current + 1) % cameras.length;
            cameraIndexRef.current = next;
            setCameraIndex(next);
            updatePhase('globe');
        }, ZOOM_OUT_WAIT_MS);
        return () => { if (timer2.current) clearTimeout(timer2.current); };
    }, [phase, cameras.length, updatePhase]);

    // When entering globe phase (new camera), delay tracking so the globe spins
    // away first — guarantees a visible rotation for every camera including the first.
    const trackDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (phase !== 'globe') return;
        setTrackTarget(false);
        trackDelayRef.current = setTimeout(() => setTrackTarget(true), 800);
        return () => { if (trackDelayRef.current) clearTimeout(trackDelayRef.current); };
    }, [phase, cameraIndex]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timer1.current) clearTimeout(timer1.current);
            if (timer2.current) clearTimeout(timer2.current);
            if (timer3.current) clearTimeout(timer3.current);
            if (trackDelayRef.current) clearTimeout(trackDelayRef.current);
        };
    }, []);

    if (rawCameras.length === 0) return null;

    const showPip = phase === 'pip';
    const showSparkles = phase === 'zooming_in' || phase === 'zooming_out';
    const globeScale = phase === 'zooming_in' || phase === 'pip' ? 5 : 1;

    /**
     * Compute where the current camera's dot sits on screen (as % of viewport).
     * When the globe faces the target:
     *   - x is always 50% (longitude centred by rotY)
     *   - y depends on latitude: globe centre ≈ 47vh, radius ≈ 44vh
     *     with a tilt factor of 0.18 applied inside EarthAnimation.
     */
    const dotYPercent = cam?.coords
        ? Math.max(8, Math.min(88,
            47 - Math.sin((cam.coords.lat * 1.06 * Math.PI) / 180) * 44,
          ))
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
                    position: 'absolute',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    transformOrigin: zoomOrigin,
                    zIndex: 1,
                }}
                animate={{ scale: globeScale }}
                transition={
                    phase === 'zooming_in'
                        ? { duration: 3.5, ease: [0.4, 0, 0.15, 1] }
                        : phase === 'zooming_out'
                          ? { duration: 2, ease: 'easeOut' }
                          : { duration: 0 }
                }
            >
                <EarthAnimation
                    scrollY={0}
                    targetLat={isGlobePhase ? (cam?.coords?.lat) : undefined}
                    targetLon={isGlobePhase ? (cam?.coords?.lon) : undefined}
                    onFacingTarget={isGlobePhase ? handleFacingTarget : undefined}
                    markerCoords={allMarkerCoords.length > 0 ? allMarkerCoords : undefined}
                    frozen={phase === 'pip'}
                />
            </motion.div>

            {/* Star-Wars hyperspace warp — sides only, canvas clips center for the globe */}
            <AnimatePresence>
                {showSparkles && (
                    <motion.div
                        key={`warp-${phase}`}
                        className="pointer-events-none absolute"
                        style={{ inset: 0, zIndex: 5, position: 'absolute' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <StarWarpEffect
                            duration={phase === 'zooming_out' ? ZOOM_OUT_DURATION_MS : ZOOM_IN_DURATION_MS}
                            reverse={phase === 'zooming_out'}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Location name card — shown while globe rests on the city, no extra circle */}
            <AnimatePresence>
                {showLabel && cam && (
                    <motion.div
                        key={`label-${cameraIndex}`}
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
                        <div
                            style={{
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
                            }}
                        >
                            {countryFlag(cam.countryCode)}{cam.countryCode ? ' ' : ''}{cam.display_name || cam.location}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/*
             * Current camera iframe — preloaded from globe phase so the video
             * is already running when PiP becomes visible.
             * The `key` ensures the iframe is remounted only when the camera changes.
             */}
            {cam?.pipSrc && (
                <motion.div
                    key={`pip-${cameraIndex}`}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ zIndex: 100 }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: showPip ? 1 : 0,
                        scale: showPip ? 1 : 0,
                    }}
                    transition={
                        showPip
                            ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                            : { duration: 0.5, ease: [0.64, 0, 0.78, 0] }
                    }
                >
                    <div
                        style={{
                            width: '72vw',
                            aspectRatio: '16/9',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow:
                                '0 0 0 2px rgba(26,231,132,0.4), 0 40px 100px rgba(0,0,0,0.8)',
                        }}
                    >
                        {cam.isDirectVideo ? (
                            <HlsVideo
                                src={cam.pipSrc ?? ''}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    border: 'none',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            <iframe
                                src={cam.embedUrl ?? undefined}
                                style={{
                                    position: 'absolute',
                                    top: '-8%',
                                    left: '-8%',
                                    width: '116%',
                                    height: '116%',
                                    border: 'none',
                                    display: 'block',
                                }}
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                        {/* City name badge — top-left corner of PiP */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                background: 'rgba(0,0,0,0.72)',
                                border: '1px solid rgba(26,231,132,0.6)',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                color: '#1ae784',
                                fontFamily: 'monospace',
                                fontSize: '21px',
                                fontWeight: 600,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                backdropFilter: 'blur(6px)',
                                zIndex: 10,
                                pointerEvents: 'none',
                            }}
                        >
                            {countryFlag(cam.countryCode)}{cam.countryCode ? ' ' : ''}{cam.display_name || cam.location}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

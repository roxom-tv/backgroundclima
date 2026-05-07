'use client';

import { useEffect, useRef, useState } from 'react';
import type { EarthHotspot } from './earthHotspotTypes';
import {
    EARTH_HERO_LOGO_FALLBACK,
    useEarthAnimationHotspotTemplates,
} from './hooks/useEarthAnimationHotspotTemplates';

type Hotspot = EarthHotspot;

const LAND_BUCKETS = 4;
const OCEAN_BUCKETS = 2;
const LAND_ALPHA = [0.24, 0.42, 0.64, 0.92];
const OCEAN_ALPHA = [0.08, 0.18];
/** Land-only stipple; ocean buckets stay out of the draw path. */
const RENDER_OCEAN_STIPPLE = false;
/** Globe radius as a fraction of `min(cw,ch)`; EarthHero margin math assumes ~this value. */
const GLOBE_RADIUS_FRACTION = 0.44;
/** Desktop-only: slight “zoom out” as the user scrolls (mobile unchanged). */
const DESKTOP_RADIUS_BOOST = 0.09;
const DESKTOP_SCROLL_SHRINK_PX = 300;
/** Min distance from canvas top to sphere top so the dome is never hard-clipped. */
const GLOBE_CANVAS_TOP_PADDING_PX = 6;

function smoothstep01(edge0: number, edge1: number, x: number): number {
    if (x <= edge0) {
        return 0;
    }

    if (x >= edge1) {
        return 1;
    }

    const t = (x - edge0) / (edge1 - edge0);

    return t * t * (3 - 2 * t);
}

interface CameraMarker {
    lat: number;
    lon: number;
}

interface EarthAnimationProps {
    /** Used on desktop to ease globe scale from slightly larger (top) toward base as user scrolls. */
    readonly scrollY?: number;
    /** When set, globe rotates to face this latitude (decimal degrees). */
    readonly targetLat?: number;
    /** When set, globe rotates to face this longitude (decimal degrees). */
    readonly targetLon?: number;
    /** Fired once when the globe has centered on targetLat/targetLon. */
    readonly onFacingTarget?: () => void;
    /** Camera location markers rendered as large pulsing dots on the globe. */
    readonly markerCoords?: CameraMarker[];
    /** When true, halts all rotation (auto-spin and target tracking). */
    readonly frozen?: boolean;
}

/**
 * Renders a Canvas 2D rotating globe with interactive hotspots (v1: hardcoded
 * tickers with shared placeholder logo; live data may follow later).
 *
 * Desktop: optional scroll-driven sphere scale (“zoom out” while scrolling).
 * Radius is capped so the dome stays inside the canvas top (no hard clip).
 * Mobile: layout and interaction unchanged (no dependence on scroll for size).
 *
 * @param props - `{ scrollY }` forwarded from Earth hero for desktop scale easing
 * @returns Full-size canvas for the Earth hero
 */
const EarthAnimation = ({
    scrollY = 0,
    targetLat,
    targetLon,
    onFacingTarget,
    markerCoords,
    frozen = false,
}: EarthAnimationProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCanvasVisible, setIsCanvasVisible] = useState(false);
    const { hotspots } = useEarthAnimationHotspotTemplates();
    const scrollYRef = useRef(0);
    const targetLatRef = useRef(targetLat);
    const targetLonRef = useRef(targetLon);
    const onFacingTargetRef = useRef(onFacingTarget);
    const facingFiredRef = useRef(false);
    const markerCoordsRef = useRef<CameraMarker[]>(markerCoords ?? []);
    const frozenRef = useRef(frozen);

    useEffect(() => {
        scrollYRef.current = scrollY;
    }, [scrollY]);

    useEffect(() => {
        frozenRef.current = frozen;
    }, [frozen]);

    useEffect(() => {
        markerCoordsRef.current = markerCoords ?? [];
    }, [markerCoords]);

    useEffect(() => {
        targetLatRef.current = targetLat;
        targetLonRef.current = targetLon;
        onFacingTargetRef.current = onFacingTarget;
        facingFiredRef.current = false;
    }, [targetLat, targetLon, onFacingTarget]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        let animId = 0;
        let mounted = true;
        let hoveredIndex = -1;

        const mouse = { x: -9999, y: -9999 };
        const tilt = { x: 0, y: 0 };
        const targetTilt = { x: 0, y: 0 };
        let rotY = 0;
        let time = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartRotY = 0;

        const logoImages = new Map<string, HTMLImageElement>();
        const uniqueLogos = [...new Set(hotspots.map((h) => h.logo))];

        uniqueLogos.forEach((src) => {
            const img = new Image();

            if (src.startsWith('http://') || src.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onerror = () => {
                if (img.getAttribute('data-earth-logo-fallback') === '1') {
                    img.onerror = null;

                    return;
                }

                if (src === EARTH_HERO_LOGO_FALLBACK) {
                    img.setAttribute('data-earth-logo-fallback', '1');
                    img.onerror = null;

                    return;
                }
                img.setAttribute('data-earth-logo-fallback', '1');
                img.src = EARTH_HERO_LOGO_FALLBACK;
            };
            img.src = src;
            logoImages.set(src, img);
        });

        const onMouseMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();

            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;

            targetTilt.x = ((e.clientY - (r.top + r.height * 0.5)) / r.height) * 0.12;
            targetTilt.y = ((e.clientX - (r.left + r.width * 0.5)) / r.width) * 0.12;
        };

        const onMouseLeave = () => {
            mouse.x = -9999;
            mouse.y = -9999;
            hoveredIndex = -1;
        };
        const onMouseDown = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;

            mouse.x = x;
            mouse.y = y;

            isDragging = true;
            dragStartX = e.clientX;
            dragStartRotY = rotY;
            hoveredIndex = -1;
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onWindowMouseMove = (e: MouseEvent) => {
            if (!isDragging) {
                return;
            }

            const dx = e.clientX - dragStartX;
            rotY = dragStartRotY + dx * 0.005;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousemove', onWindowMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseleave', onMouseLeave);

        const resize = () => {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            const dpr = window.devicePixelRatio || 1;

            if (!w || !h) {
                return;
            }
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };

        resize();
        let resizeRaf = 0;
        const scheduleResize = () => {
            if (resizeRaf) {
                return;
            }
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                resize();
            });
        };
        const ro = new ResizeObserver(scheduleResize);
        ro.observe(canvas);

        const img = new Image();
        img.src = '/assets/earthMask.png';

        img.onload = () => {
            if (!mounted) {
                return;
            }

            const mW = img.width;
            const mH = img.height;
            const offscreen = document.createElement('canvas');
            offscreen.width = mW;
            offscreen.height = mH;
            const offCtx = offscreen.getContext('2d');

            if (!offCtx) {
                return;
            }
            offCtx.drawImage(img, 0, 0);
            const { data: maskData } = offCtx.getImageData(0, 0, mW, mH);

            const isLandPixel = (lat: number, lon: number): boolean => {
                const u = (lon / Math.PI + 1) * 0.5;
                const v = (Math.PI * 0.5 - lat) / Math.PI;
                const px = Math.max(0, Math.min(mW - 1, Math.floor(u * mW)));
                const py = Math.max(0, Math.min(mH - 1, Math.floor(v * mH)));

                return maskData[(py * mW + px) * 4] > 128;
            };
            const isLandAtPixel = (px: number, py: number): boolean => {
                if (px < 0 || py < 0 || px >= mW || py >= mH) {
                    return false;
                }

                return maskData[(py * mW + px) * 4] > 128;
            };
            const pixelToLatLon = (px: number, py: number): { lat: number; lon: number } => {
                const u = (px + 0.5) / mW;
                const v = (py + 0.5) / mH;

                return {
                    lat: Math.PI * 0.5 - v * Math.PI,
                    lon: (u * 2 - 1) * Math.PI,
                };
            };
            const snapHotspotToLand = (lat: number, lon: number): { lat: number; lon: number } => {
                if (isLandPixel(lat, lon)) {
                    return { lat, lon };
                }

                const u = (lon / Math.PI + 1) * 0.5;
                const v = (Math.PI * 0.5 - lat) / Math.PI;
                const centerX = Math.max(0, Math.min(mW - 1, Math.floor(u * mW)));
                const centerY = Math.max(0, Math.min(mH - 1, Math.floor(v * mH)));

                const maxRadius = Math.max(mW, mH);

                for (let radius = 1; radius <= maxRadius; radius++) {
                    const xMin = centerX - radius;
                    const xMax = centerX + radius;
                    const yMin = centerY - radius;
                    const yMax = centerY + radius;

                    for (let x = xMin; x <= xMax; x++) {
                        if (isLandAtPixel(x, yMin)) {
                            return pixelToLatLon(x, yMin);
                        }

                        if (isLandAtPixel(x, yMax)) {
                            return pixelToLatLon(x, yMax);
                        }
                    }

                    for (let y = yMin + 1; y < yMax; y++) {
                        if (isLandAtPixel(xMin, y)) {
                            return pixelToLatLon(xMin, y);
                        }

                        if (isLandAtPixel(xMax, y)) {
                            return pixelToLatLon(xMax, y);
                        }
                    }
                }

                return { lat, lon };
            };

            type SphPt = { lat: number; lon: number; land: boolean };
            const pts: SphPt[] = [];
            const N = 13000;
            const GOLDEN = Math.PI * (3 - Math.sqrt(5));

            for (let i = 0; i < N; i++) {
                const y = 1 - (i / (N - 1)) * 2;
                const r = Math.sqrt(Math.max(0, 1 - y * y));
                const theta = GOLDEN * i;
                const x = Math.cos(theta) * r;
                const z = Math.sin(theta) * r;
                const lat = Math.asin(Math.max(-1, Math.min(1, y)));
                const lon = Math.atan2(x, z);
                const land = isLandPixel(lat, lon);

                if (land || Math.random() < 0.42) {
                    pts.push({ lat, lon, land });
                }
            }

            const maxPts = pts.length;
            const landBuf = Array.from(
                { length: LAND_BUCKETS },
                () => new Float32Array(maxPts * 2),
            );
            const landCount = new Int32Array(LAND_BUCKETS);
            const oceanBuf = Array.from(
                { length: OCEAN_BUCKETS },
                () => new Float32Array(maxPts * 2),
            );
            const oceanCount = new Int32Array(OCEAN_BUCKETS);

            const hotspotRad = hotspots.map((h) => {
                const lat = (h.latDeg * Math.PI) / 180;
                const lon = (h.lonDeg * Math.PI) / 180;
                const snapped = snapHotspotToLand(lat, lon);

                return {
                    ...h,
                    lat: snapped.lat,
                    lon: snapped.lon,
                };
            });

            const drawCard = (x: number, y: number, hotspot: Hotspot) => {
                const cardMinW = 124;
                const cardH = 38;
                const gap = 14;
                const pointerHeight = 8;
                const padX = 16;
                const minGap = 12;
                const cardMaxW = Math.min(220, canvas.offsetWidth - 24);
                const arrow = hotspot.positive ? '▲' : '▼';
                const changeText = `${arrow} ${hotspot.change}`;

                ctx.font = '600 12px Inter, sans-serif';
                const tickerWidth = ctx.measureText(hotspot.ticker).width;
                const changeWidth = ctx.measureText(changeText).width;
                const cardW = Math.max(
                    cardMinW,
                    Math.min(cardMaxW, Math.ceil(padX * 2 + tickerWidth + minGap + changeWidth)),
                );

                let cardX = x - cardW / 2;
                let cardY = y - cardH - gap - pointerHeight - 18;

                cardX = Math.max(12, Math.min(canvas.offsetWidth - cardW - 12, cardX));
                cardY = Math.max(12, Math.min(canvas.offsetHeight - cardH - 12, cardY));

                ctx.save();

                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255,255,255,0.10)';
                ctx.lineWidth = 1;
                ctx.moveTo(x, y - 28);
                ctx.lineTo(x, cardY + cardH);
                ctx.stroke();

                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, 12);
                ctx.fillStyle = 'rgba(18,18,22,0.62)';
                ctx.fill();
                // pointer (triángulo centrado abajo)
                const pointerWidth = 10;

                const px = x; // posición real del hotspot
                const py = cardY + cardH;

                ctx.beginPath();
                ctx.moveTo(px - pointerWidth / 2, py);
                ctx.lineTo(px + pointerWidth / 2, py);
                ctx.lineTo(px, py + pointerHeight);
                ctx.closePath();

                ctx.fill();

                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, 12);
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 1;
                ctx.stroke();

                const glow = ctx.createRadialGradient(
                    cardX + cardW * 0.5,
                    cardY + cardH * 0.5,
                    4,
                    cardX + cardW * 0.5,
                    cardY + cardH * 0.5,
                    90,
                );
                glow.addColorStop(0, 'rgba(255,255,255,0.045)');
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, 12);
                ctx.fill();

                ctx.textAlign = 'left';

                const changeX = cardX + cardW - padX;
                const leftX = cardX + padX;

                ctx.fillStyle = 'rgba(255,255,255,0.94)';
                ctx.fillText(hotspot.ticker, leftX, cardY + 24);

                ctx.fillStyle = hotspot.positive
                    ? 'rgba(74,222,128,0.95)'
                    : 'rgba(248,113,113,0.95)';
                ctx.textAlign = 'right';
                ctx.fillText(changeText, changeX, cardY + 24);
                ctx.textAlign = 'left';

                ctx.restore();
            };

            /**
             * Paints a stock logo inside a circular mask (like `border-radius: 50%` +
             * `object-fit: cover`). Square SVGs are scaled and cropped so they match
             * the round marker treatment.
             */
            const drawStockLogoInCircle = (
                c: CanvasRenderingContext2D,
                logoEl: HTMLImageElement,
                cx: number,
                cy: number,
                clipRadiusPx: number,
            ): void => {
                const iw = logoEl.naturalWidth || logoEl.width;
                const ih = logoEl.naturalHeight || logoEl.height;

                if (iw <= 0 || ih <= 0) {
                    return;
                }

                c.save();
                c.beginPath();
                c.arc(cx, cy, clipRadiusPx, 0, Math.PI * 2);
                c.closePath();
                c.clip();

                const d = clipRadiusPx * 2;
                const scale = Math.max(d / iw, d / ih);
                const dw = iw * scale;
                const dh = ih * scale;

                c.drawImage(logoEl, cx - dw * 0.5, cy - dh * 0.5, dw, dh);
                c.restore();
            };

            const draw = () => {
                if (!mounted) {
                    return;
                }

                time += 0.016;

                const cw = canvas.offsetWidth;
                const ch = canvas.offsetHeight;
                ctx.clearRect(0, 0, cw, ch);
                const isMobileViewport = cw < 768;

                const isHoveringHotspot = hoveredIndex !== -1;

                const tiltLerp = isHoveringHotspot ? 0.012 : 0.035;
                /** Base ~ prior “hotspot hover” speed; extra slow on hotspot + pause while dragging */
                const rotationSpeed = isDragging ? 0 : isHoveringHotspot ? 0.00012 : 0.00042;

                tilt.x += (targetTilt.x - tilt.x) * tiltLerp;
                tilt.y += (targetTilt.y - tilt.y) * tiltLerp;

                // Target-city rotation: lerp rotY toward the city's longitude
                const tLon = targetLonRef.current;
                const tLat = targetLatRef.current;

                if (!frozenRef.current) {
                    if (tLon !== undefined && tLat !== undefined) {
                        const desiredRotY = -(tLon * Math.PI) / 180;
                        // Normalize difference to [-π, π] for shortest-path rotation
                        let diff = desiredRotY - rotY;
                        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
                        rotY += diff * 0.025;

                        // Also tilt the latitude slightly into view
                        const desiredTiltX = (tLat * Math.PI) / 180 * 0.06;
                        targetTilt.x = desiredTiltX;

                        // Fire onFacingTarget once the error is small enough
                        if (!facingFiredRef.current && Math.abs(diff) < 0.015) {
                            facingFiredRef.current = true;
                            onFacingTargetRef.current?.();
                        }
                    } else {
                        rotY += rotationSpeed;
                    }
                }

                const scrollProgress = Math.min(1, scrollYRef.current / DESKTOP_SCROLL_SHRINK_PX);
                const scrollEase = scrollProgress * scrollProgress;
                const radiusBoost = isMobileViewport ? 0 : DESKTOP_RADIUS_BOOST * (1 - scrollEase);
                const cx = cw * 0.5;
                /** Vertical center of globe in canvas; keep EarthHero `SPHERE_TOP_FRACTION` ≈ this − `GLOBE_RADIUS_FRACTION`. */
                const cyFraction = 0.47;
                const cy = ch * cyFraction;

                let radius = Math.min(cw, ch) * GLOBE_RADIUS_FRACTION * (1 + radiusBoost);
                const maxRadiusByTop = cy - GLOBE_CANVAS_TOP_PADDING_PX;

                if (maxRadiusByTop > 1 && radius > maxRadiusByTop) {
                    radius = maxRadiusByTop;
                }

                const bgGlow = ctx.createRadialGradient(
                    cx,
                    cy + radius * 0.12,
                    radius * 0.18,
                    cx,
                    cy + radius * 0.12,
                    radius * 1.22,
                );
                bgGlow.addColorStop(
                    0,
                    isMobileViewport ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.14)',
                );
                bgGlow.addColorStop(
                    0.28,
                    isMobileViewport ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
                );
                bgGlow.addColorStop(
                    0.58,
                    isMobileViewport ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.025)',
                );
                bgGlow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = bgGlow;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
                ctx.fill();

                const halo = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.02);
                halo.addColorStop(
                    0,
                    isMobileViewport ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                );
                halo.addColorStop(
                    isMobileViewport ? 0.82 : 0.7,
                    isMobileViewport ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.09)',
                );
                halo.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
                ctx.fill();

                landCount.fill(0);
                oceanCount.fill(0);

                for (const p of pts) {
                    const lon = p.lon + rotY + tilt.y;
                    const lat = p.lat + tilt.x;
                    const cosLat = Math.cos(lat);
                    const z3 = cosLat * Math.cos(lon);

                    if (z3 <= 0.01) {
                        continue;
                    }

                    const x3 = cosLat * Math.sin(lon);
                    const y3 = Math.sin(lat);
                    const sx = cx + x3 * radius;
                    const sy = cy - y3 * radius;

                    if (p.land) {
                        const b = Math.min(LAND_BUCKETS - 1, Math.floor(z3 * LAND_BUCKETS));
                        const i = landCount[b]++ * 2;
                        landBuf[b][i] = sx;
                        landBuf[b][i + 1] = sy;
                    } else if (RENDER_OCEAN_STIPPLE) {
                        const b = z3 > 0.5 ? 1 : 0;
                        const i = oceanCount[b]++ * 2;
                        oceanBuf[b][i] = sx;
                        oceanBuf[b][i + 1] = sy;
                    }
                }

                for (let b = 0; b < LAND_BUCKETS; b++) {
                    const count = landCount[b];

                    if (!count) {
                        continue;
                    }
                    const landAlpha = isMobileViewport ? [0.3, 0.5, 0.72, 0.96] : LAND_ALPHA;
                    ctx.fillStyle = `rgba(26,231,132,${landAlpha[b]})`;
                    ctx.beginPath();
                    const buf = landBuf[b];

                    for (let i = 0; i < count; i++) {
                        ctx.rect(buf[i * 2] - 0.85, buf[i * 2 + 1] - 0.85, 1.7, 1.7);
                    }
                    ctx.fill();
                }

                if (RENDER_OCEAN_STIPPLE) {
                    for (let b = 0; b < OCEAN_BUCKETS; b++) {
                        const count = oceanCount[b];

                        if (!count) {
                            continue;
                        }
                        const oceanAlpha = isMobileViewport ? [0.11, 0.24] : OCEAN_ALPHA;
                        const oceanTone = isMobileViewport ? '170,170,184' : '145,145,160';
                        ctx.fillStyle = `rgba(${oceanTone},${oceanAlpha[b]})`;
                        ctx.beginPath();
                        const buf = oceanBuf[b];

                        for (let i = 0; i < count; i++) {
                            ctx.rect(buf[i * 2] - 0.6, buf[i * 2 + 1] - 0.6, 1.2, 1.2);
                        }
                        ctx.fill();
                    }
                }

                const projectedHotspots: Array<{
                    x: number;
                    y: number;
                    z: number;
                    limbAlpha: number;
                    hotspot: Hotspot;
                    index: number;
                }> = [];

                const hotspotZClip = 0.012;

                for (let i = 0; i < hotspotRad.length; i++) {
                    const h = hotspotRad[i];
                    const lon = h.lon + rotY + tilt.y;
                    const lat = h.lat + tilt.x;
                    const cosLat = Math.cos(lat);
                    const z3 = cosLat * Math.cos(lon);

                    if (z3 <= hotspotZClip) {
                        continue;
                    }

                    const limbAlpha = smoothstep01(0.022, 0.095, z3);

                    const x3 = cosLat * Math.sin(lon);
                    const y3 = Math.sin(lat);
                    const sx = cx + x3 * radius;
                    const sy = cy - y3 * radius;

                    projectedHotspots.push({
                        x: sx,
                        y: sy,
                        z: z3,
                        limbAlpha,
                        hotspot: h,
                        index: i,
                    });
                }

                const minHotspotDistance = isMobileViewport ? 78 : 58;
                const visibleHotspots: Array<{
                    x: number;
                    y: number;
                    z: number;
                    limbAlpha: number;
                    hotspot: Hotspot;
                    index: number;
                }> = [];
                const sortedProjected = [...projectedHotspots].sort((a, b) => b.z - a.z);

                for (const candidate of sortedProjected) {
                    let tooClose = false;

                    for (const kept of visibleHotspots) {
                        const dx = candidate.x - kept.x;
                        const dy = candidate.y - kept.y;

                        if (Math.hypot(dx, dy) < minHotspotDistance) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) {
                        visibleHotspots.push(candidate);
                    }
                }

                let nearest = -1;
                let nearestDist = Infinity;

                for (const p of visibleHotspots) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 20 && dist < nearestDist) {
                        nearest = p.index;
                        nearestDist = dist;
                    }
                }

                hoveredIndex = nearest;

                for (const p of visibleHotspots) {
                    const isHover = p.index === hoveredIndex;
                    const pulse = 1 + Math.sin(time * 1.15 + p.x * 0.006) * 0.14;
                    const a = p.limbAlpha;

                    ctx.save();
                    ctx.globalAlpha = a;

                    if (!isHover) {
                        const baseOuter = 11;
                        const outerR = baseOuter * pulse;
                        const innerR = 3.6;

                        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR * 2.5);
                        glow.addColorStop(0, 'rgba(26,231,132,0.11)');
                        glow.addColorStop(0.35, 'rgba(26,231,132,0.05)');
                        glow.addColorStop(0.72, 'rgba(26,231,132,0.02)');
                        glow.addColorStop(1, 'rgba(26,231,132,0)');
                        ctx.fillStyle = glow;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, outerR * 2.5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(26,231,132,0.22)';
                        ctx.lineWidth = 1.1;
                        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.fillStyle = 'rgba(26,231,132,0.98)';
                        ctx.arc(p.x, p.y, innerR, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        continue;
                    }

                    const hoverSize = 26;

                    const hoverGlow = ctx.createRadialGradient(
                        p.x,
                        p.y,
                        0,
                        p.x,
                        p.y,
                        hoverSize * 1.9,
                    );
                    hoverGlow.addColorStop(0, 'rgba(255,255,255,0.16)');
                    hoverGlow.addColorStop(0.5, 'rgba(255,255,255,0.06)');
                    hoverGlow.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = hoverGlow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, hoverSize * 1.9, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(16,16,20,0.88)';
                    ctx.arc(p.x, p.y, hoverSize, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                    ctx.lineWidth = 1.1;
                    ctx.arc(p.x, p.y, hoverSize, 0, Math.PI * 2);
                    ctx.stroke();

                    const logoImg = logoImages.get(p.hotspot.logo);

                    if (logoImg && logoImg.complete) {
                        const logoClipRadius = Math.max(10, hoverSize - 5);
                        drawStockLogoInCircle(ctx, logoImg, p.x, p.y, logoClipRadius);
                    }
                    ctx.restore();
                }

                const hoveredProjected = visibleHotspots.find((p) => p.index === hoveredIndex);

                if (hoveredProjected) {
                    drawCard(hoveredProjected.x, hoveredProjected.y, hoveredProjected.hotspot);
                }

                // Camera location markers — large pulsing dots
                for (const m of markerCoordsRef.current) {
                    const markerLatRad = (m.lat * Math.PI) / 180;
                    const markerLonRad = (m.lon * Math.PI) / 180;
                    const adjLon = markerLonRad + rotY + tilt.y;
                    const adjLat = markerLatRad + tilt.x;
                    const cosLat = Math.cos(adjLat);
                    const z3 = cosLat * Math.cos(adjLon);

                    if (z3 <= 0.012) continue; // back-face cull

                    const limbAlpha = Math.min(1, (z3 - 0.012) / 0.07);
                    const x3 = cosLat * Math.sin(adjLon);
                    const y3 = Math.sin(adjLat);
                    const sx = cx + x3 * radius;
                    const sy = cy - y3 * radius;

                    const pulse = 1 + Math.sin(time * 2.2 + sx * 0.01) * 0.22;
                    const outerR = 18 * pulse;
                    const innerR = 7;

                    ctx.save();
                    ctx.globalAlpha = limbAlpha;

                    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR * 3);
                    glow.addColorStop(0, 'rgba(26,231,132,0.35)');
                    glow.addColorStop(0.45, 'rgba(26,231,132,0.12)');
                    glow.addColorStop(1, 'rgba(26,231,132,0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(sx, sy, outerR * 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(26,231,132,0.75)';
                    ctx.lineWidth = 2;
                    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(26,231,132,1.0)';
                    ctx.arc(sx, sy, innerR, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }

                animId = requestAnimationFrame(draw);
            };

            draw();
            requestAnimationFrame(() => {
                if (mounted) {
                    setIsCanvasVisible(true);
                }
            });
        };

        img.onerror = () => {
            console.warn('[EarthAnimation] earthMask.png not found — globe will not render');
        };

        return () => {
            mounted = false;
            cancelAnimationFrame(animId);
            cancelAnimationFrame(resizeRaf);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousemove', onWindowMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            ro.disconnect();
        };
    }, [hotspots]);

    return (
        <canvas
            ref={canvasRef}
            className={`block h-full w-full transition-opacity duration-700 ease-out ${
                isCanvasVisible ? 'opacity-100' : 'opacity-0'
            }`}
        />
    );
};

export default EarthAnimation;

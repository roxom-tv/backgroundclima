'use client';

import { useEffect, useRef } from 'react';

/**
 * Video player that supports:
 *  - Native HLS (Safari)
 *  - hls.js (Chrome, OBS browser, Firefox)
 *  - Plain MP4 / direct video URLs
 */
export function HlsVideo({ src, style }: { src: string; style?: React.CSSProperties }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        const isHls = /\.m3u8(\?|$)/i.test(src) || src.includes('m3u8');

        if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
            let hlsInstance: import('hls.js').default | null = null;
            import('hls.js').then(({ default: Hls }) => {
                if (!Hls.isSupported()) {
                    video.src = src;
                    video.play().catch(() => {});
                    return;
                }
                hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 0,
                });
                hlsInstance.loadSource(src);
                hlsInstance.attachMedia(video);
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(() => {});
                });
            });
            return () => { hlsInstance?.destroy(); };
        } else {
            video.src = src;
            video.play().catch(() => {});
        }
    }, [src]);

    return (
        <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            style={style}
        />
    );
}

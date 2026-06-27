'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const EarthAnimation = dynamic(() => import('./EarthAnimation'), {
    ssr: false,
    loading: () => null,
});

const EARTH_MASK_GRADIENT =
    'linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 5%, rgba(0,0,0,0.78) 11%, rgba(0,0,0,0.94) 20%, black 34%, black 100%)';

const EARTH_VIGNETTE_CSS =
    'radial-gradient(circle at 50% 72%, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.014) 11%, rgba(0,0,0,0) 32%), radial-gradient(circle at 50% 66%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.36) 68%, rgba(0,0,0,0.62) 82%, rgba(0,0,0,0.88) 94%, rgba(0,0,0,0.96) 100%)';

const EARTH_RIM_BOTTOM_CSS =
    'linear-gradient(to top, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 18%, transparent 42%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.38) 66%, rgba(0,0,0,0.78) 84%, rgba(0,0,0,0.94) 96%, black 100%)';

/** Black → transparent over `bg-roxom-dark-15` (no second opaque tone = no stepped bands). */
const PRODUCTS_SCRIM_GRADIENT =
    'linear-gradient(180deg,rgb(0,0,0) 0%,rgba(0,0,0,0.97) 6%,rgba(0,0,0,0.9) 14%,rgba(0,0,0,0.78) 26%,rgba(0,0,0,0.58) 40%,rgba(0,0,0,0.38) 55%,rgba(0,0,0,0.2) 70%,rgba(0,0,0,0.08) 84%,rgba(0,0,0,0) 100%)';

const SCROLL_FADE_START_PX = 36;
const SCROLL_FADE_END_PX = 200;

/** Matches Tailwind earth square: cap size so the hero is not thousands of px of masked black. */
const EARTH_BLOCK_WIDTH_CSS = 'min(122vw,2200px,88svh)';
/** Must stay in sync with `EarthAnimation` sphere layout: ~(cyFraction − `GLOBE_RADIUS_FRACTION`). */
const SPHERE_TOP_FRACTION_OF_BLOCK = 0.47 - 0.44;
/** Target space from title baseline to visible dome (fluid `clamp`; tuned ~½ prior gap). */
const TITLE_TO_SPHERE_GAP = 'clamp(2rem, 2.25vmin, 2.5rem)';

function scrollToTitleOpacity(scrollY: number): number {
    if (scrollY <= SCROLL_FADE_START_PX) {
        return 1;
    }

    if (scrollY >= SCROLL_FADE_END_PX) {
        return 0;
    }
    const t = (scrollY - SCROLL_FADE_START_PX) / (SCROLL_FADE_END_PX - SCROLL_FADE_START_PX);

    return 1 - t * t;
}

interface EarthHeroProps {
    children?: React.ReactNode;
}

const EarthHero = ({ children }: EarthHeroProps) => {
    const [entered, setEntered] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const id = requestAnimationFrame(() => setEntered(true));

        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const titleScrollOpacity = scrollToTitleOpacity(scrollY);
    const titleLiftPx = scrollY * 0.2;
    const titleBlurPx = (1 - titleScrollOpacity) * 5;

    return (
        <div className="relative w-full min-w-0 overflow-x-clip overflow-y-visible bg-gradient-to-b from-black via-black/80 to-transparent">
            <section
                className={cn(
                    'relative flex min-h-0 min-w-0 flex-col items-stretch overflow-x-clip overflow-y-visible bg-black',
                    'pb-24 max-md:pb-20 md:pb-32',
                )}
            >
                <div
                    className={cn(
                        'pointer-events-none relative z-10 flex w-full min-w-0 flex-col items-center px-6 pt-[15vh] text-center',
                    )}
                >
                    <div
                        className="relative z-20 mb-5 max-w-[100vw]"
                        style={{
                            opacity: titleScrollOpacity,
                            transform: `translateY(${-titleLiftPx}px)`,
                            filter: titleBlurPx > 0.02 ? `blur(${titleBlurPx}px)` : 'none',
                        }}
                    >
                        <p
                            className={cn(
                                'mb-6 uppercase text-white/25 transition-all delay-[120ms] duration-700 ease-out',
                                'font-[var(--font-ibm-plex-mono)]',
                                'max-md:text-[0.6875rem] max-md:leading-snug max-md:tracking-[0.22em]',
                                'md:text-xs md:tracking-[0.3em]',
                                entered ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                            )}
                        >
                            GLOBAL MARKETS · BITCOIN SETTLEMENT
                        </p>

                        <h1 className="font-[var(--font-inter)] text-white">
                            <span
                                className={cn(
                                    'block whitespace-nowrap text-[clamp(2.8rem,7vw,5.8rem)] font-light leading-[1.02] tracking-tight text-white transition-all delay-[220ms] duration-700 ease-out',
                                    entered
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-8 opacity-0',
                                )}
                            >
                                Trade the World
                            </span>
                            <span
                                className={cn(
                                    'mt-0 block whitespace-nowrap text-[clamp(2.8rem,7vw,5.8rem)] font-medium leading-[1.02] tracking-tight text-white transition-all delay-[360ms] duration-700 ease-out',
                                    entered
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-8 opacity-0',
                                )}
                            >
                                in <span className="text-[#f5f7ff]">Bitcoin</span>
                            </span>
                        </h1>
                    </div>
                </div>

                {/*
                  Full-bleed strip: `122vw` must be centered against the layout viewport, not
                  the padded content box — otherwise the globe drifts (scrollbar / vw vs %).
                  `margin-left: calc(50% - 50vw)` + `width: 100vw` aligns the strip to the viewport.
                */}
                <div
                    className={cn(
                        'relative z-[8] ml-[calc(50%-50vw)] flex w-screen min-w-0 shrink-0 justify-center',
                    )}
                >
                    <div
                        className={cn(
                            'relative aspect-square w-[min(122vw,2200px,88svh)] max-w-none shrink-0',
                            entered ? 'opacity-100' : 'opacity-0',
                        )}
                        style={{
                            marginTop: `max(0px, calc(${TITLE_TO_SPHERE_GAP} - (${EARTH_BLOCK_WIDTH_CSS}) * ${SPHERE_TOP_FRACTION_OF_BLOCK}))`,
                            transition:
                                'opacity 1400ms ease-out 520ms, filter 1400ms ease-out 520ms',
                            transitionProperty: 'opacity, filter',
                            filter: entered ? 'blur(0px)' : 'blur(4px)',
                        }}
                    >
                        <div
                            className="h-full w-full"
                            style={{
                                maskImage: EARTH_MASK_GRADIENT,
                                WebkitMaskImage: EARTH_MASK_GRADIENT,
                                maskPosition: 'center',
                                maskRepeat: 'no-repeat',
                                maskSize: '100% 100%',
                                WebkitMaskPosition: 'center',
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskSize: '100% 100%',
                            }}
                        >
                            <EarthAnimation scrollY={scrollY} />
                        </div>
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-[1]"
                            style={{ backgroundImage: EARTH_RIM_BOTTOM_CSS }}
                        />
                    </div>
                </div>

                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-[4]"
                    style={{ backgroundImage: EARTH_VIGNETTE_CSS }}
                />
            </section>
            {children ? (
                <div
                    className={cn(
                        'bg-roxom-dark-15 relative z-30 w-full',
                        'min-h-screen pb-16 md:pb-24',
                        '-mt-20 pt-14 max-md:-mt-16 max-md:pt-12 md:-mt-24 md:pt-16',
                    )}
                    id="products"
                >
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(14rem,52vh,36rem)] max-h-[min(90vh,42rem)]"
                        style={{ backgroundImage: PRODUCTS_SCRIM_GRADIENT }}
                    />
                    <div className="relative z-[1]">{children}</div>
                </div>
            ) : null}
        </div>
    );
};

export default EarthHero;

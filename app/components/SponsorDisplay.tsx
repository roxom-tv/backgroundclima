'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Sponsor, SponsorPosition } from '@/lib/types/admin';

interface SponsorDisplayProps {
    sponsor?: Sponsor | null;
    sponsors?: Sponsor[]; // Legacy support
    visible?: boolean;
    position?: SponsorPosition;
    showLabel?: boolean; // Show "Presented by" text
}

// Position-based CSS classes
const positionClasses: Record<SponsorPosition, string> = {
    top_left: 'absolute top-4 left-4',
    top_right: 'absolute top-4 right-4',
    bottom_left: 'absolute bottom-4 left-4',
    bottom_right: 'absolute bottom-4 right-4',
};

export default function SponsorDisplay({
    sponsor,
    sponsors,
    visible = true,
    position,
    showLabel = true,
}: SponsorDisplayProps) {
    // Don't render if not visible
    if (!visible) {
        return null;
    }

    // Determine which sponsor to display
    let displaySponsor: Sponsor | null = null;

    if (sponsor) {
        // New: direct sponsor prop
        displaySponsor = sponsor.is_active ? sponsor : null;
    } else if (sponsors && sponsors.length > 0) {
        // Legacy: sponsors array - get first active
        displaySponsor = sponsors.find((s) => s.is_active) || null;
    }

    // If no sponsor to display and this is a positioned display, render nothing
    if (!displaySponsor && position) {
        return null;
    }

    // If no sponsor from DB, show default sponsor (only for non-positioned legacy usage)
    if (!displaySponsor && !position) {
        return (
            <div className="sponsor-display">
                <div className="sponsor-separator"></div>
                <div className="sponsor-content">
                    <div className="sponsor-text">Presented by</div>
                    <div className="sponsor-logo">
                        <Image
                            src="/xapologo.png"
                            alt="XAPO BANK"
                            width={320}
                            height={100}
                            className="xapo-logo"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!displaySponsor) {
        return null;
    }

    // For positioned sponsors, use compact layout
    if (position) {
        return (
            <div className={`${positionClasses[position]} z-20`}>
                <div className="sponsor-compact bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10">
                    {showLabel && (
                        <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 text-center">
                            Presented by
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={displaySponsor.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center justify-center"
                        >
                            {displaySponsor.logo_url ? (
                                <Image
                                    src={displaySponsor.logo_url}
                                    alt={displaySponsor.name}
                                    width={160}
                                    height={50}
                                    className="max-h-10 w-auto object-contain"
                                    unoptimized={displaySponsor.logo_url.startsWith('http')}
                                />
                            ) : (
                                <span className="text-white text-sm font-bold tracking-wider">
                                    {displaySponsor.name.toUpperCase()}
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Legacy non-positioned display
    return (
        <div className="sponsor-display">
            <div className="sponsor-separator"></div>
            <div className="sponsor-content">
                {showLabel && <div className="sponsor-text">Presented by</div>}
                <div className="sponsor-logo">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={displaySponsor.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {displaySponsor.logo_url ? (
                                <Image
                                    src={displaySponsor.logo_url}
                                    alt={displaySponsor.name}
                                    width={320}
                                    height={100}
                                    className="xapo-logo"
                                    unoptimized={displaySponsor.logo_url.startsWith('http')}
                                />
                            ) : (
                                <span className="text-white text-3xl font-bold tracking-wider">
                                    {displaySponsor.name.toUpperCase()}
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

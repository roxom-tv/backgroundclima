'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Sponsor } from '@/lib/supabase/types';

interface SponsorDisplayProps {
  sponsors: Sponsor[];
  visible?: boolean;
}

export default function SponsorDisplay({ sponsors, visible = true }: SponsorDisplayProps) {
  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Filter active sponsors
  const activeSponsors = sponsors.filter(s => s.is_active);

  // If no sponsors from DB, show default sponsor
  if (activeSponsors.length === 0) {
    return (
      <div className="sponsor-display">
        <div className="sponsor-separator"></div>
        <div className="sponsor-content">
          <div className="sponsor-text">
            Presented by
          </div>
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

  // Show first active sponsor (could be extended to rotate through sponsors)
  const mainSponsor = activeSponsors[0];

  return (
    <div className="sponsor-display">
      <div className="sponsor-separator"></div>
      <div className="sponsor-content">
        <div className="sponsor-text">
          Presented by
        </div>
        <div className="sponsor-logo">
          <AnimatePresence mode="wait">
            <motion.div
              key={mainSponsor.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {mainSponsor.logo_url ? (
                <Image
                  src={mainSponsor.logo_url}
                  alt={mainSponsor.name}
                  width={320}
                  height={100}
                  className="xapo-logo"
                  unoptimized={mainSponsor.logo_url.startsWith('http')}
                />
              ) : (
                <span className="text-white text-3xl font-bold tracking-wider">
                  {mainSponsor.name.toUpperCase()}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

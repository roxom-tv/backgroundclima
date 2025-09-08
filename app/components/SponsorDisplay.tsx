'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SponsorDisplay() {
  return (
    <div className="sponsor-display">
      {/* Sponsor Separator */}
      <div className="sponsor-separator"></div>
      
      <div className="sponsor-content">
        <div className="sponsor-text">
          Presented by
        </div>
        <div className="sponsor-logo">
          <Image
            src="/xapologo.png"
            alt="XAPO BANK"
            width={240}
            height={80}
            className="xapo-logo"
          />
        </div>
      </div>
    </div>
  );
}

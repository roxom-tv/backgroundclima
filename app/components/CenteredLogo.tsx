'use client';

import Image from 'next/image';

export default function CenteredLogo() {
  return (
    <div className="centered-logo">
      <Image
        src="/isortv.png"
        alt="ISOR TV Logo"
        width={400}
        height={200}
        className="logo-image"
        priority
      />
    </div>
  );
}

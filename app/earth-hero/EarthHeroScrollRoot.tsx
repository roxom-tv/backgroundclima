'use client';

import { useEffect } from 'react';

export function EarthHeroScrollRoot({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.documentElement.classList.add('earth-hero-route');
        document.body.classList.add('earth-hero-route');

        return () => {
            document.documentElement.classList.remove('earth-hero-route');
            document.body.classList.remove('earth-hero-route');
        };
    }, []);

    return <>{children}</>;
}

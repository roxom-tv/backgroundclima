import type { Metadata } from 'next';

import { EarthHeroScrollRoot } from './EarthHeroScrollRoot';

export const metadata: Metadata = {
    title: 'Earth Hero · ROXOM.TV',
    description: 'Earth hero globe demo (roxoland parity)',
};

export default function EarthHeroRouteLayout({ children }: { children: React.ReactNode }) {
    return <EarthHeroScrollRoot>{children}</EarthHeroScrollRoot>;
}

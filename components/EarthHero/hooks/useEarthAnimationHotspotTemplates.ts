import { useMemo } from 'react';

import { buildVisualEarthHotspots, type EarthHotspot } from '../earthHotspotTypes';

export const EARTH_HERO_LOGO_FALLBACK = '/logo-gradient.png' as const;

const STOCK_LOGOS = '/assets/stock-logos' as const;

const EARTH_HERO_ASSETS = [
    {
        ticker: 'BTCE',
        country: 'DE',
        logo: 'https://cdn.roxom.com/images/companies/GBTC.jpeg',
    },
    { ticker: 'STRC', country: 'US', logo: `${STOCK_LOGOS}/strategy.svg` },
    { ticker: 'STRD', country: 'US', logo: `${STOCK_LOGOS}/strategy.svg` },
    { ticker: 'STRK', country: 'US', logo: `${STOCK_LOGOS}/strategy.svg` },
    { ticker: 'SATA', country: 'US', logo: `${STOCK_LOGOS}/strive.svg` },
    { ticker: 'MSTR', country: 'US', logo: `${STOCK_LOGOS}/strategy.svg` },
    { ticker: 'NVDA', country: 'US', logo: `${STOCK_LOGOS}/nvidia.svg` },
    { ticker: 'AAPL', country: 'US', logo: `${STOCK_LOGOS}/apple.svg` },
    { ticker: 'TSLA', country: 'US', logo: `${STOCK_LOGOS}/TSLA.svg` },
    { ticker: 'SP500', country: 'US', logo: `${STOCK_LOGOS}/us500.svg` },
    { ticker: 'GOLD', country: '', logo: `${STOCK_LOGOS}/gold.svg` },
] as const;

type HotspotTemplate = Omit<EarthHotspot, 'latDeg' | 'lonDeg'>;

const HARDCODED_HOTSPOT_TEMPLATES: HotspotTemplate[] = EARTH_HERO_ASSETS.map((asset) => ({
    ticker: asset.ticker,
    logo: asset.logo,
    price: '0',
    change: '0.00%',
    positive: true,
}));

export const useEarthAnimationHotspotTemplates = (): {
    hotspots: EarthHotspot[];
    isLoading: boolean;
} => {
    const hotspots = useMemo(() => buildVisualEarthHotspots(HARDCODED_HOTSPOT_TEMPLATES), []);

    return {
        hotspots,
        isLoading: false,
    };
};

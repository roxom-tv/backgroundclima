export type EarthHotspot = {
    latDeg: number;
    lonDeg: number;
    ticker: string;
    logo: string;
    price: string;
    change: string;
    positive: boolean;
};

export const EARTH_HOTSPOT_CANDIDATE_COUNT = 44;

/**
 * Distributes template rows across the globe using a golden-angle layout.
 */
export const buildVisualEarthHotspots = (
    templates: Omit<EarthHotspot, 'latDeg' | 'lonDeg'>[],
): EarthHotspot[] => {
    if (templates.length === 0) {
        return [];
    }

    const hotspots: EarthHotspot[] = [];
    const goldenAngle = 137.50776405;

    for (let i = 0; i < EARTH_HOTSPOT_CANDIDATE_COUNT; i++) {
        const template = templates[i % templates.length];
        const y = 1 - (2 * (i + 0.5)) / EARTH_HOTSPOT_CANDIDATE_COUNT;
        const latBase = (Math.asin(y) * 180) / Math.PI;
        const latJitter = Math.sin(i * 12.91) * 4.8;
        const lonBase = ((i * goldenAngle) % 360) - 180;
        const lonJitter = Math.cos(i * 7.37) * 7.2;
        const latDeg = Math.max(-62, Math.min(62, latBase + latJitter));
        const lonDeg = lonBase + lonJitter;

        hotspots.push({
            latDeg,
            lonDeg,
            ...template,
        });
    }

    return hotspots;
};

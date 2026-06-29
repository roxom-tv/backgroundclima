import { useEffect, useState } from 'react';

export interface MarketsSatsData {
    btcUsd: number;
    timestamp: string;
    metals: {
        gold: { usd: number; sats: number; change24hPct: number | null };
        silver: { usd: number; sats: number; change24hPct: number | null };
    };
    oil: {
        wti: { usd: number; sats: number; change24hPct: number | null };
        brent: { usd: number; sats: number; change24hPct: number | null };
    };
    copper: { usd: number; sats: number; change24hPct: number | null };
    fx: {
        EUR: { usdPerUnit: number; satsPerUnit: number };
        JPY: { usdPerUnit: number; satsPerUnit: number };
        GBP: { usdPerUnit: number; satsPerUnit: number };
        USD: { usdPerUnit: number; satsPerUnit: number };
    };
    stale?: boolean;
}

/**
 * Generate dummy market data for testing/demo purposes
 */
function generateDummyData(btcPrice: number = 95000): MarketsSatsData {
    // Helper to convert USD to sats
    const usdToSats = (usd: number) => (usd / btcPrice) * 100_000_000;

    return {
        btcUsd: btcPrice,
        timestamp: new Date().toISOString(),
        metals: {
            gold: {
                usd: 2650.5,
                sats: usdToSats(2650.5),
                change24hPct: 0.85,
            },
            silver: {
                usd: 32.15,
                sats: usdToSats(32.15),
                change24hPct: -0.42,
            },
        },
        oil: {
            wti: {
                usd: 78.5,
                sats: usdToSats(78.5),
                change24hPct: 1.25,
            },
            brent: {
                usd: 82.3,
                sats: usdToSats(82.3),
                change24hPct: 1.15,
            },
        },
        copper: {
            usd: 28.5,
            sats: usdToSats(28.5),
            change24hPct: -0.5,
        },
        fx: {
            EUR: {
                usdPerUnit: 1.085,
                satsPerUnit: usdToSats(1.085),
            },
            JPY: {
                usdPerUnit: 0.0067,
                satsPerUnit: usdToSats(0.0067),
            },
            GBP: {
                usdPerUnit: 1.265,
                satsPerUnit: usdToSats(1.265),
            },
            USD: {
                usdPerUnit: 1.0,
                satsPerUnit: usdToSats(1.0),
            },
        },
    };
}

// Shared state para prefetch - permite que múltiples componentes compartan los mismos datos
let sharedMarketsData: MarketsSatsData | null = null;
let sharedLoading = false;
let sharedError: Error | null = null;
let fetchPromise: Promise<void> | null = null;

async function fetchMarketsDataInternal(
    setData?: (data: MarketsSatsData | null) => void,
    setLoading?: (loading: boolean) => void,
    setError?: (error: Error | null) => void,
) {
    // Si ya hay un fetch en progreso, esperar a que termine
    if (fetchPromise) {
        await fetchPromise;

        return;
    }

    fetchPromise = (async () => {
        sharedLoading = true;

        try {
            // Solo mostrar loading si no hay datos cached
            if (!sharedMarketsData && setLoading) {
                setLoading(true);
            }

            const response = await fetch('/api/markets/sats', {
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(`Markets API error: ${response.status}`);
            }

            const result = await response.json();

            // Check if we have ANY real data (partial data is acceptable)
            const hasMetalsData = result.metals?.gold?.usd > 0 || result.metals?.silver?.usd > 0;
            const hasOilData = result.oil?.wti?.usd > 0 || result.oil?.brent?.usd > 0;
            const hasCopperData = (result.copper?.usd ?? 0) > 0;
            const hasFxData =
                result.fx?.EUR?.usdPerUnit > 0 ||
                result.fx?.JPY?.usdPerUnit > 0 ||
                result.fx?.GBP?.usdPerUnit > 0;

            const hasAnyData = hasMetalsData || hasOilData || hasCopperData || hasFxData;
            const isStale = result.stale === true;

            // Accept data if:
            // 1. We have any real data (partial is fine), OR
            // 2. It's marked as stale (cached data from server), OR
            // 3. We already have cached data and this is an update attempt
            if (hasAnyData || isStale || sharedMarketsData) {
                // If we have new data (even partial or stale), use it
                if (hasAnyData || isStale) {
                    sharedMarketsData = result;
                    sharedError = null;

                    if (setData) {
                        setData(result);
                    }
                    if (setError) {
                        setError(null);
                    }
                }
                // If no new data but we have existing cached data, keep it
                // (don't overwrite with empty data)
            } else {
                // No data at all: usar datos de demostración para que siempre se vea contenido
                if (!sharedMarketsData) {
                    const fallback = generateDummyData(result?.btcUsd || 95000);
                    sharedMarketsData = fallback;
                    sharedError = null;

                    if (setData) {
                        setData(fallback);
                    }
                    if (setError) {
                        setError(null);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching markets data:', err);

            if (!sharedMarketsData) {
                const fallback = generateDummyData(95000);
                sharedMarketsData = fallback;
                sharedError = null;

                if (setData) {
                    setData(fallback);
                }
                if (setError) {
                    setError(null);
                }
            }
        } finally {
            sharedLoading = false;

            if (setLoading) {
                setLoading(false);
            }
            fetchPromise = null;
        }
    })();

    await fetchPromise;
}

export function useMarketsSats(enabled: boolean = true) {
    const [data, setData] = useState<MarketsSatsData | null>(sharedMarketsData);
    const [loading, setLoading] = useState(!sharedMarketsData || sharedLoading);
    const [error, setError] = useState<Error | null>(sharedError);

    useEffect(() => {
        // Don't fetch if disabled
        if (!enabled) {
            return;
        }

        // Si ya hay datos compartidos, usarlos inmediatamente
        if (sharedMarketsData && !data) {
            setData(sharedMarketsData);
            setLoading(false);
            setError(null);
        }

        if (!sharedMarketsData && sharedLoading) {
            setLoading(true);
        }

        // Fetch inmediatamente si no hay datos
        if (!sharedMarketsData) {
            fetchMarketsDataInternal(setData, setLoading, setError);
        }

        // Then fetch every 5 minutes (matches backend cache; Pyth limit 30 req/10s — muy holgado)
        const interval = setInterval(
            () => {
                fetchMarketsDataInternal(setData, setLoading, setError);
            },
            5 * 60 * 1000,
        );

        return () => clearInterval(interval);
    }, [enabled]);

    return { data, loading, error };
}

// Función para prefetch desde fuera del hook
export async function prefetchMarketsData(): Promise<void> {
    if (!sharedMarketsData) {
        await fetchMarketsDataInternal();
    }
}

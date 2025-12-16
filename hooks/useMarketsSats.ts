import { useEffect, useState } from "react";

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
        usd: 2650.50,
        sats: usdToSats(2650.50),
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
        usd: 78.50,
        sats: usdToSats(78.50),
        change24hPct: 1.25,
      },
      brent: {
        usd: 82.30,
        sats: usdToSats(82.30),
        change24hPct: 1.15,
      },
    },
    fx: {
      EUR: {
        usdPerUnit: 1.0850,
        satsPerUnit: usdToSats(1.0850),
      },
      JPY: {
        usdPerUnit: 0.0067,
        satsPerUnit: usdToSats(0.0067),
      },
      GBP: {
        usdPerUnit: 1.2650,
        satsPerUnit: usdToSats(1.2650),
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

async function fetchMarketsDataInternal(setData?: (data: MarketsSatsData | null) => void, setLoading?: (loading: boolean) => void, setError?: (error: Error | null) => void) {
  // Si ya hay un fetch en progreso, esperar a que termine
  if (fetchPromise) {
    await fetchPromise;
    return;
  }

  fetchPromise = (async () => {
    try {
      // Solo mostrar loading si no hay datos cached
      if (!sharedMarketsData && setLoading) {
        setLoading(true);
      }
      
      const response = await fetch("/api/markets/sats", {
        cache: "no-store",
      });
      
      if (!response.ok) {
        throw new Error(`Markets API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if we have real data (non-zero values)
      const hasRealData = result.metals?.gold?.usd > 0 || 
                         result.oil?.wti?.usd > 0 || 
                         result.fx?.EUR?.usdPerUnit > 0;
      
      if (hasRealData) {
        sharedMarketsData = result;
        sharedError = null;
        if (setData) setData(result);
        if (setError) setError(null);
      } else {
        // No real data available - APIs not configured or returned zeros
        // Pero no sobrescribir datos existentes si los hay
        if (!sharedMarketsData) {
          console.warn("No real market data available. Please configure API keys.");
          sharedError = new Error("Market data APIs not configured or unavailable");
          sharedMarketsData = null;
          if (setData) setData(null);
          if (setError) setError(sharedError);
        }
      }
      
    } catch (err) {
      console.error("Error fetching markets data:", err);
      // No sobrescribir datos existentes en caso de error
      if (!sharedMarketsData) {
        sharedError = err instanceof Error ? err : new Error("Unknown error");
        sharedMarketsData = null;
        if (setData) setData(null);
        if (setError) setError(sharedError);
      }
    } finally {
      if (setLoading) setLoading(false);
      fetchPromise = null;
    }
  })();

  await fetchPromise;
}

export function useMarketsSats() {
  const [data, setData] = useState<MarketsSatsData | null>(sharedMarketsData);
  const [loading, setLoading] = useState(!sharedMarketsData && sharedLoading);
  const [error, setError] = useState<Error | null>(sharedError);

  useEffect(() => {
    // Si ya hay datos compartidos, usarlos inmediatamente
    if (sharedMarketsData && !data) {
      setData(sharedMarketsData);
      setLoading(false);
      setError(null);
    }

    // Fetch inmediatamente si no hay datos
    if (!sharedMarketsData) {
      fetchMarketsDataInternal(setData, setLoading, setError);
    }

    // Then fetch every 15 minutes (matches backend cache duration)
    // El backend cachea 15 minutos - mínimo entre Oil (15 min) y FX (30 min)
    const interval = setInterval(() => {
      fetchMarketsDataInternal(setData, setLoading, setError);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

// Función para prefetch desde fuera del hook
export async function prefetchMarketsData(): Promise<void> {
  if (!sharedMarketsData) {
    await fetchMarketsDataInternal();
  }
}


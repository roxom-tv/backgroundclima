/**
 * Shared BTC price cache to avoid duplicate API calls
 * This cache is shared across all API routes and components
 */

interface BTCCacheEntry {
  price: number;
  timestamp: number;
}

const BTC_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - optimized to minimize API calls
let btcCache: BTCCacheEntry | null = null;

function parsePrice(priceString: string): number {
  // Remove $ and commas, then parse as float
  // Example: "$101,270.04" -> 101270.04
  const cleaned = priceString.replace(/[$,]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new Error(`Invalid price format: ${priceString}`);
  }
  return parsed;
}

/**
 * Get BTC price with shared cache
 * This prevents duplicate API calls across different routes
 */
export async function getBTCPriceWithCache(): Promise<number> {
  const now = Date.now();
  
  // Return cached price if still valid
  if (btcCache && (now - btcCache.timestamp) < BTC_CACHE_DURATION) {
    return btcCache.price;
  }

  // Fetch new price
  try {
    const rtvApiUrl = process.env.RTV_API_URL || 'https://api.roxom.tv';
    const rtvApiKey = process.env.RTV_API_KEY || process.env.NEXT_PUBLIC_RTV_API_KEY || '';

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (rtvApiKey) headers['x-api-key'] = rtvApiKey;

    const response = await fetch(`${rtvApiUrl}/api/btc/info`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`rtv-api error: ${response.status}`);
    }

    const envelope = await response.json();
    const json = envelope?.success && envelope.data ? envelope.data : envelope;
    const livePriceString = json.price?.live_price;

    if (!livePriceString || typeof livePriceString !== "string") {
      throw new Error("Invalid BTC price data from Roxom API");
    }

    const price = parsePrice(livePriceString);

    // Update cache
    btcCache = {
      price,
      timestamp: now,
    };

    return price;
  } catch (error) {
    console.error("Error fetching BTC price:", error);
    // Return cached price if available, even if expired
    if (btcCache) {
      return btcCache.price;
    }
    // Fallback to a recent average BTC price if API fails
    return 95000;
  }
}



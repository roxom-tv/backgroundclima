import { NextResponse } from "next/server";

export const revalidate = 0; // No cache - always fetch fresh data

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

export async function GET() {
  try {
    // Using Roxom BTC API
    const url =
      "https://rtvapi.roxom.com/btc/info?apiKey=60be7d11-ec67-4ac0-9241-da1cbdcba73d";

    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store",
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // Silently return fallback price instead of throwing error
      const fallbackPrice = 65000; // Approximate fallback
      return NextResponse.json(
        {
          btcPriceUsd: fallbackPrice,
          timestamp: new Date().toISOString(),
          priceChange: null,
          marketCap: null,
          btcDominance: null,
          _fallback: true,
        },
        {
          status: 200, // Return 200 with fallback data
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const json = await response.json();
    const livePriceString = json.price?.live_price;

    if (!livePriceString || typeof livePriceString !== "string") {
      // Return fallback instead of error
      const fallbackPrice = 65000;
      return NextResponse.json(
        {
          btcPriceUsd: fallbackPrice,
          timestamp: new Date().toISOString(),
          priceChange: null,
          marketCap: null,
          btcDominance: null,
          _fallback: true,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const btcPrice = parsePrice(livePriceString);

    const result = {
      btcPriceUsd: btcPrice,
      timestamp: new Date().toISOString(),
      // Include additional data from Roxom API
      priceChange: json.price?.live_price_1 || null,
      marketCap: json.price?.market_cap || null,
      btcDominance: json.price?.btc_dominance || null,
    };

    const nextResponse = NextResponse.json(result);
    nextResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    return nextResponse;
  } catch (error) {
    // Silently handle errors and return fallback price
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn("BTC API error, using fallback:", error instanceof Error ? error.message : 'Unknown error');
    }
    
    const fallbackPrice = 65000;
    return NextResponse.json(
      {
        btcPriceUsd: fallbackPrice,
        timestamp: new Date().toISOString(),
        priceChange: null,
        marketCap: null,
        btcDominance: null,
        _fallback: true,
      },
      {
        status: 200, // Return 200 with fallback data
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}


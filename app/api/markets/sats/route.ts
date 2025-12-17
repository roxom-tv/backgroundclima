import { NextResponse } from "next/server";
import { getBTCPriceWithCache } from "@/lib/btc-cache";
import {
  canMakeMetalsRequest,
  incrementMetalsRequest,
  getMetalsRemainingRequests,
  getMetalsRequestsPerDay,
} from "@/lib/metals-rate-limit";

// Disable caching to ensure real-time data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface MarketsCacheEntry {
  data: MarketsSatsResponse;
  timestamp: number;
}

interface MarketsSatsResponse {
  btcUsd: number;
  timestamp: string;
  metals: {
    gold: { usd: number; sats: number; change24hPct: number | null };
    silver: { usd: number; sats: number; change24hPct: number | null };
    rateLimitInfo?: {
      remaining: number;
      requestsPerDay: number;
      limitReached: boolean;
    };
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

const MARKETS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - mínimo entre Oil (15 min) y FX (30 min)
let marketsCache: MarketsCacheEntry | null = null;

// Cache separado para Metals.dev (límite gratuito: 100 requests/mes)
// 100/mes = ~3.3/día = cache de 8 horas para estar seguros
interface MetalsCacheEntry {
  data: {
    gold: { usd: number; change24hPct: number | null };
    silver: { usd: number; change24hPct: number | null };
  };
  timestamp: number;
}
const METALS_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours - para cumplir límite de 100 requests/mes
let metalsCache: MetalsCacheEntry | null = null;

// Cache separado para Oil (plan Exploration: 10,000 requests/mes)
// Cache de 15 minutos para actualizaciones más frecuentes
interface OilCacheEntry {
  data: {
    wti: { usd: number; change24hPct: number | null };
    brent: { usd: number; change24hPct: number | null };
  };
  timestamp: number;
}
const OIL_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let oilCache: OilCacheEntry | null = null;

// Cache separado para FX (30 minutos)
interface FxCacheEntry {
  data: {
    EUR: { usdPerUnit: number };
    JPY: { usdPerUnit: number };
    GBP: { usdPerUnit: number };
  };
  timestamp: number;
}
const FX_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
let fxCache: FxCacheEntry | null = null;

/**
 * Convert USD price to satoshis
 */
function usdToSats(usdPrice: number, btcUsdPrice: number): number {
  return (usdPrice / btcUsdPrice) * 100_000_000;
}

/**
 * Fetch BTC price (with cache) - Usa Roxom API
 */
async function getBTCPrice(): Promise<number> {
  return getBTCPriceWithCache();
}

/**
 * Fetch metals data (Gold and Silver) from metals.dev
 * API: https://api.metals.dev/v1/metal/spot
 * Rate limit: 100 requests/mes - usa cache separado de 8 horas
 */
async function fetchMetals(apiUrl: string, apiKey: string): Promise<{
  gold: { usd: number; change24hPct: number | null };
  silver: { usd: number; change24hPct: number | null };
  rateLimitInfo?: {
    remaining: number;
    requestsPerDay: number;
    limitReached: boolean;
  };
}> {
  const now = Date.now();
  
  // Verificar cache de Metals primero (8 horas)
  if (metalsCache && (now - metalsCache.timestamp) < METALS_CACHE_DURATION) {
    console.log("Using cached Metals.dev data");
    return {
      ...metalsCache.data,
      rateLimitInfo: {
        remaining: getMetalsRemainingRequests(),
        requestsPerDay: getMetalsRequestsPerDay(),
        limitReached: false,
      },
    };
  }
  
  // Verificar rate limit antes de hacer requests
  // Cada llamada consume 1 request (un solo endpoint devuelve todos los metales)
  const canMakeRequest = canMakeMetalsRequest();
  const remaining = getMetalsRemainingRequests();
  const requestsPerDay = getMetalsRequestsPerDay();
  
  if (!canMakeRequest || remaining < 1) {
    console.warn(`Metals.dev rate limit reached. Remaining: ${remaining}, Requests per day: ${requestsPerDay}`);
    // Si hay cache expirado, usarlo de todas formas
    if (metalsCache) {
      console.log("Using expired Metals cache due to rate limit");
      return {
        ...metalsCache.data,
        rateLimitInfo: {
          remaining,
          requestsPerDay,
          limitReached: true,
        },
      };
    }
    return {
      gold: { usd: 0, change24hPct: null },
      silver: { usd: 0, change24hPct: null },
      rateLimitInfo: {
        remaining,
        requestsPerDay,
        limitReached: true,
      },
    };
  }
  
  try {
    // Metals.dev API: usar endpoint /v1/latest con símbolos gold y silver
    // Formato: https://api.metals.dev/v1/latest?api_key=...&currency=USD&unit=toz
    // La respuesta incluye todos los metales, filtramos gold y silver
    // Según docs: https://metals.dev/symbols - los símbolos son "gold" y "silver"
    const baseUrl = 'https://api.metals.dev';
    const url = `${baseUrl}/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`;
    
    console.log("Metals URL:", url.replace(apiKey, '***'));
    
    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Metals API error ${response.status}:`, errorText.substring(0, 200));
      throw new Error(`Metals API error: ${response.status}`);
    }

    const json = await response.json();
    
    // Debug: Log raw API response
    console.log("Metals.dev response:", JSON.stringify(json).substring(0, 500));
    
    // Incrementar contador (1 request para todos los metales)
    incrementMetalsRequest();
    
    const newRemaining = getMetalsRemainingRequests();
    const newRequestsPerDay = getMetalsRequestsPerDay();
    
    // Metals.dev response format: { status: "success", metals: { gold: number, silver: number, ... } }
    // Los precios están directamente en json.metals.gold y json.metals.silver como números
    const metals = json.metals || {};
    const goldPrice = metals.gold || "0";
    const silverPrice = metals.silver || "0";
    
    // Metals.dev no proporciona change_24h en el endpoint /v1/latest, solo precios
    const goldChange = null;
    const silverChange = null;
    
    console.log("Parsed metals:", { goldPrice, silverPrice, goldChange, silverChange });
    
    const result = {
      gold: {
        usd: parseFloat(String(goldPrice)),
        change24hPct: goldChange !== null ? parseFloat(String(goldChange)) : null,
      },
      silver: {
        usd: parseFloat(String(silverPrice)),
        change24hPct: silverChange !== null ? parseFloat(String(silverChange)) : null,
      },
      rateLimitInfo: {
        remaining: newRemaining,
        requestsPerDay: newRequestsPerDay,
        limitReached: false,
      },
    };
    
    // Actualizar cache de Metals (8 horas)
    metalsCache = {
      data: {
        gold: result.gold,
        silver: result.silver,
      },
      timestamp: now,
    };
    
    return result;
  } catch (error) {
    console.error("Error fetching metals:", error);
    // Si hay cache disponible (incluso expirado), usarlo
    if (metalsCache) {
      console.log("Using expired Metals cache due to error");
      return {
        ...metalsCache.data,
        rateLimitInfo: {
          remaining,
          requestsPerDay,
          limitReached: false,
        },
      };
    }
    // Return zeros on error - caller will handle stale data
    return {
      gold: { usd: 0, change24hPct: null },
      silver: { usd: 0, change24hPct: null },
      rateLimitInfo: {
        remaining,
        requestsPerDay,
        limitReached: false,
      },
    };
  }
}

/**
 * Fetch oil data (WTI and Brent) from oilpriceapi.com
 * API: https://api.oilpriceapi.com/v1/prices/latest
 * Uses separate 15-minute cache
 */
async function fetchOil(apiUrl: string, apiKey: string): Promise<{
  wti: { usd: number; change24hPct: number | null };
  brent: { usd: number; change24hPct: number | null };
}> {
  const now = Date.now();
  
  // Verificar cache de Oil primero (15 minutos)
  if (oilCache && (now - oilCache.timestamp) < OIL_CACHE_DURATION) {
    console.log("Using cached Oil data");
    return oilCache.data;
  }
  
  try {
    // OilPriceAPI: hacer dos llamadas separadas (WTI y Brent)
    // La documentación no confirma que se puedan pasar múltiples códigos en un solo parámetro
    // Formato: https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD
    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json',
    };
    
    // Fetch WTI y Brent en paralelo
    const [wtiResponse, brentResponse] = await Promise.allSettled([
      fetch(`${apiUrl}?by_code=WTI_USD`, {
        next: { revalidate: 0 },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers,
      }),
      fetch(`${apiUrl}?by_code=BRENT_USD`, {
        next: { revalidate: 0 },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers,
      }),
    ]);

    // Procesar respuesta de WTI
    let wtiPrice = 0;
    let wtiChange: number | null = null;
    
    if (wtiResponse.status === "fulfilled" && wtiResponse.value.ok) {
      const wtiJson = await wtiResponse.value.json();
      console.log("OilPriceAPI WTI response:", JSON.stringify(wtiJson).substring(0, 500));
      
      if (wtiJson.status === "success" && wtiJson.data) {
        // Cuando se usa by_code, los datos vienen directamente en data, no en data.CODE
        const wtiData = wtiJson.data.WTI_USD || wtiJson.data;
        wtiPrice = parseFloat(String(wtiData.price || wtiData.spot || wtiData.value || "0"));
        // El cambio puede estar en change_24h o en changes.24h.percent
        if (wtiData.change_24h !== undefined) {
          wtiChange = parseFloat(String(wtiData.change_24h));
        } else if (wtiData.changes?.["24h"]?.percent !== undefined) {
          wtiChange = parseFloat(String(wtiData.changes["24h"].percent));
        } else {
          wtiChange = null;
        }
        console.log("WTI parsed:", { price: wtiPrice, change: wtiChange });
      } else {
        console.warn("WTI response format unexpected:", wtiJson);
      }
    } else {
      const errorText = wtiResponse.status === "fulfilled" 
        ? await wtiResponse.value.text() 
        : wtiResponse.reason?.message || "Unknown error";
      console.error(`Oil API WTI error:`, errorText.substring(0, 200));
    }

    // Procesar respuesta de Brent
    let brentPrice = 0;
    let brentChange: number | null = null;
    
    if (brentResponse.status === "fulfilled" && brentResponse.value.ok) {
      const brentJson = await brentResponse.value.json();
      console.log("OilPriceAPI Brent response:", JSON.stringify(brentJson).substring(0, 500));
      
      if (brentJson.status === "success" && brentJson.data) {
        // Cuando se usa by_code, los datos vienen directamente en data, no en data.CODE
        const brentData = brentJson.data.BRENT_USD || brentJson.data.BRENT_CRUDE_USD || brentJson.data.BRENT || brentJson.data;
        brentPrice = parseFloat(String(brentData.price || brentData.spot || brentData.value || "0"));
        // El cambio puede estar en change_24h o en changes.24h.percent
        if (brentData.change_24h !== undefined) {
          brentChange = parseFloat(String(brentData.change_24h));
        } else if (brentData.changes?.["24h"]?.percent !== undefined) {
          brentChange = parseFloat(String(brentData.changes["24h"].percent));
        } else {
          brentChange = null;
        }
        console.log("Brent parsed:", { price: brentPrice, change: brentChange });
      } else {
        console.warn("Brent response format unexpected:", brentJson);
      }
    } else {
      const errorText = brentResponse.status === "fulfilled" 
        ? await brentResponse.value.text() 
        : brentResponse.reason?.message || "Unknown error";
      console.error(`Oil API Brent error:`, errorText.substring(0, 200));
      
      // Si BRENT_USD falla, intentar con BRENT_CRUDE_USD como fallback
      if (brentResponse.status === "fulfilled" && !brentResponse.value.ok) {
        try {
          const fallbackResponse = await fetch(`${apiUrl}?by_code=BRENT_CRUDE_USD`, {
            next: { revalidate: 0 },
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
            headers,
          });
          
          if (fallbackResponse.ok) {
            const fallbackJson = await fallbackResponse.json();
            console.log("OilPriceAPI Brent fallback (BRENT_CRUDE_USD) response:", JSON.stringify(fallbackJson).substring(0, 500));
            
            if (fallbackJson.status === "success" && fallbackJson.data) {
              // Los datos vienen directamente en data cuando se usa by_code
              const brentData = fallbackJson.data.BRENT_CRUDE_USD || fallbackJson.data;
              brentPrice = parseFloat(String(brentData.price || brentData.spot || brentData.value || "0"));
              // El cambio puede estar en change_24h o en changes.24h.percent
              if (brentData.change_24h !== undefined) {
                brentChange = parseFloat(String(brentData.change_24h));
              } else if (brentData.changes?.["24h"]?.percent !== undefined) {
                brentChange = parseFloat(String(brentData.changes["24h"].percent));
              } else {
                brentChange = null;
              }
              console.log("Brent data found using BRENT_CRUDE_USD code:", { price: brentPrice, change: brentChange });
            }
          }
        } catch (fallbackError) {
          console.error("Brent fallback also failed:", fallbackError);
        }
      }
    }
    
    const result = {
      wti: {
        usd: wtiPrice,
        change24hPct: wtiChange,
      },
      brent: {
        usd: brentPrice,
        change24hPct: brentChange,
      },
    };
    
    console.log("Oil data parsed:", { wti: result.wti.usd, brent: result.brent.usd });
    
    // Actualizar cache de Oil (15 minutos)
    oilCache = {
      data: result,
      timestamp: now,
    };
    
    return result;
  } catch (error) {
    console.error("Error fetching oil:", error);
    // Si hay cache disponible (incluso expirado), usarlo
    if (oilCache) {
      console.log("Using expired Oil cache due to error");
      return oilCache.data;
    }
    return {
      wti: { usd: 0, change24hPct: null },
      brent: { usd: 0, change24hPct: null },
    };
  }
}

/**
 * Fetch FX data (EUR, JPY, GBP) from exchangerate.host
 * API: https://api.exchangerate.host/latest
 * Returns rates based on USD (base currency)
 * Note: USD is always 1.0 and doesn't need API call
 * Uses separate 30-minute cache
 */
async function fetchFX(apiUrl: string, apiKey?: string): Promise<{
  EUR: { usdPerUnit: number };
  JPY: { usdPerUnit: number };
  GBP: { usdPerUnit: number };
}> {
  const now = Date.now();
  
  // Verificar cache de FX primero (30 minutos)
  if (fxCache && (now - fxCache.timestamp) < FX_CACHE_DURATION) {
    console.log("Using cached FX data");
    return fxCache.data;
  }
  
  try {
    // exchangerate.host API: Puede requerir API key dependiendo del plan
    // Formato con key: https://api.exchangerate.host/live?access_key=...&source=USD
    // Formato sin key (gratis): https://api.exchangerate.host/latest?base=USD
    let url: string;
    if (apiKey) {
      // Si hay API key, usar endpoint /live con access_key
      url = `${apiUrl.replace('/latest', '/live')}?access_key=${apiKey}&source=USD`;
    } else {
      // Sin API key, usar endpoint /latest (gratis pero limitado)
      url = `${apiUrl}?base=USD`;
    }
    
    console.log("FX API URL:", url.replace(apiKey || '', '***'));
    
    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store",
      signal: AbortSignal.timeout(15000), // Aumentado de 10s a 15s para evitar timeouts
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FX API error: ${response.status}`);
    }

    const json = await response.json();
    
    // Debug: Log raw API response
    console.log("ExchangeRate.host response:", JSON.stringify(json).substring(0, 500));
    
    // exchangerate.host puede devolver diferentes formatos
    // Verificar si tiene success: false
    if (json.success === false) {
      console.error("ExchangeRate.host error:", json);
      throw new Error("ExchangeRate.host API error");
    }
    
    // exchangerate.host response format puede variar:
    // Con API key (/live): { quotes: { USDEUR: number, USDJPY: number, ... } }
    // Sin API key (/latest): { rates: { EUR: number, JPY: number, ... } }
    let eurRate = 0;
    let jpyRate = 0;
    let gbpRate = 0;
    
    if (json.quotes) {
      // Formato con API key: quotes.USDEUR = EUR per 1 USD
      eurRate = parseFloat(json.quotes.USDEUR || "0");
      jpyRate = parseFloat(json.quotes.USDJPY || "0");
      gbpRate = parseFloat(json.quotes.USDGBP || "0");
      console.log("FX quotes format (with API key):", { eurRate, jpyRate, gbpRate });
    } else if (json.rates) {
      // Formato sin API key: rates.EUR = EUR per 1 USD
      const rates = json.rates || {};
      eurRate = parseFloat(rates.EUR || "0");
      jpyRate = parseFloat(rates.JPY || "0");
      gbpRate = parseFloat(rates.GBP || "0");
      console.log("FX rates format (free tier):", { eurRate, jpyRate, gbpRate });
    }
    
    console.log("FX rates parsed:", { eurRate, jpyRate, gbpRate });
    
    const result = {
      EUR: { usdPerUnit: eurRate > 0 ? 1 / eurRate : 0 }, // Invert: EUR per USD → USD per EUR
      JPY: { usdPerUnit: jpyRate > 0 ? 1 / jpyRate : 0 }, // Invert: JPY per USD → USD per JPY
      GBP: { usdPerUnit: gbpRate > 0 ? 1 / gbpRate : 0 }, // Invert: GBP per USD → USD per GBP
    };
    
    // Actualizar cache de FX (30 minutos)
    fxCache = {
      data: result,
      timestamp: now,
    };
    
    return result;
  } catch (error) {
    console.error("Error fetching FX:", error);
    // Si hay cache disponible (incluso expirado), usarlo
    if (fxCache) {
      console.log("Using expired FX cache due to error");
      return fxCache.data;
    }
    return {
      EUR: { usdPerUnit: 0 },
      JPY: { usdPerUnit: 0 },
      GBP: { usdPerUnit: 0 },
    };
  }
}

export async function GET() {
  const now = Date.now();
  
  // Return cached data if still valid (15 minutes)
  if (marketsCache && (now - marketsCache.timestamp) < MARKETS_CACHE_DURATION) {
    return NextResponse.json(marketsCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800", // 15 min cache
      },
    });
  }

  try {
    // Get environment variables
    const metalsApiUrl = process.env.METALS_API_URL;
    const metalsApiKey = process.env.METALS_API_KEY;
    const oilApiUrl = process.env.OIL_API_URL;
    const oilApiKey = process.env.OIL_API_KEY;
    const fxApiUrl = process.env.FX_API_URL;
    const fxApiKey = process.env.FX_API_KEY;

    // Debug: Log environment variables (sin mostrar keys completas)
    console.log("Markets API Config:", {
      metalsApiUrl: metalsApiUrl ? "✓ Set" : "✗ Missing",
      metalsApiKey: metalsApiKey ? "✓ Set" : "✗ Missing",
      oilApiUrl: oilApiUrl ? "✓ Set" : "✗ Missing",
      oilApiKey: oilApiKey ? "✓ Set" : "✗ Missing",
      fxApiUrl: fxApiUrl ? "✓ Set" : "✗ Missing",
      fxApiKey: fxApiKey ? "✓ Set" : "✗ Missing",
    });

    // Fetch BTC price first (or use cached version from Roxom)
    const btcUsd = await getBTCPrice();
    
    if (!btcUsd || btcUsd <= 0) {
      throw new Error("Invalid BTC price");
    }
    
    console.log("BTC Price fetched:", btcUsd);

    // Fetch all market data in parallel (5 requests total: BTC already cached, Metals 2x, Oil 1x, FX 1x)
    const [metalsData, oilData, fxData] = await Promise.allSettled([
      metalsApiUrl && metalsApiKey
        ? fetchMetals(metalsApiUrl, metalsApiKey)
        : Promise.resolve({ 
            gold: { usd: 0, change24hPct: null }, 
            silver: { usd: 0, change24hPct: null },
            rateLimitInfo: {
              remaining: getMetalsRemainingRequests(),
              requestsPerDay: getMetalsRequestsPerDay(),
              limitReached: false,
            },
          }),
      oilApiUrl && oilApiKey
        ? fetchOil(oilApiUrl, oilApiKey)
        : Promise.resolve({ wti: { usd: 0, change24hPct: null }, brent: { usd: 0, change24hPct: null } }),
      fxApiUrl
        ? fetchFX(fxApiUrl, fxApiKey)
        : Promise.resolve({ EUR: { usdPerUnit: 0 }, JPY: { usdPerUnit: 0 }, GBP: { usdPerUnit: 0 } }),
    ]);

    // Extract results (handle failures gracefully)
    let metals = metalsData.status === "fulfilled" 
      ? metalsData.value 
      : { 
          gold: { usd: 0, change24hPct: null }, 
          silver: { usd: 0, change24hPct: null },
          rateLimitInfo: {
            remaining: getMetalsRemainingRequests(),
            requestsPerDay: getMetalsRequestsPerDay(),
            limitReached: false,
          },
        };
    let oil = oilData.status === "fulfilled" ? oilData.value : { wti: { usd: 0, change24hPct: null }, brent: { usd: 0, change24hPct: null } };
    let fx = fxData.status === "fulfilled" ? fxData.value : { EUR: { usdPerUnit: 0 }, JPY: { usdPerUnit: 0 }, GBP: { usdPerUnit: 0 } };

    // Debug: Log results
    if (metalsData.status === "rejected") {
      console.error("Metals API failed:", metalsData.reason);
    } else {
      console.log("Metals data:", { gold: metals.gold.usd, silver: metals.silver.usd });
    }
    
    if (oilData.status === "rejected") {
      console.error("Oil API failed:", oilData.reason);
    } else {
      console.log("Oil data:", { wti: oil.wti.usd, brent: oil.brent.usd });
    }
    
    if (fxData.status === "rejected") {
      console.error("FX API failed:", fxData.reason);
    } else {
      console.log("FX data:", { EUR: fx.EUR.usdPerUnit, JPY: fx.JPY.usdPerUnit });
    }

    // Fallback: Use individual cache if API failed or returned zeros
    // Metals fallback
    if ((metals.gold.usd === 0 && metals.silver.usd === 0) || metalsData.status === "rejected") {
      if (metalsCache && (now - metalsCache.timestamp) < METALS_CACHE_DURATION * 2) {
        // Use cache even if expired (up to 2x duration) as fallback
        console.log("Using cached metals data as fallback");
        metals = metalsCache.data;
      } else if (marketsCache && marketsCache.data.metals) {
        // Fallback to general cache if individual cache not available
        console.log("Using metals data from general cache as fallback");
        const cachedMetals = marketsCache.data.metals;
        metals.gold = { usd: cachedMetals.gold.usd, change24hPct: cachedMetals.gold.change24hPct };
        metals.silver = { usd: cachedMetals.silver.usd, change24hPct: cachedMetals.silver.change24hPct };
      }
    }

    // Oil fallback
    if ((oil.wti.usd === 0 && oil.brent.usd === 0) || oilData.status === "rejected") {
      if (oilCache && (now - oilCache.timestamp) < OIL_CACHE_DURATION * 2) {
        console.log("Using cached oil data as fallback");
        oil = oilCache.data;
      } else if (marketsCache && marketsCache.data.oil) {
        console.log("Using oil data from general cache as fallback");
        const cachedOil = marketsCache.data.oil;
        oil.wti = { usd: cachedOil.wti.usd, change24hPct: cachedOil.wti.change24hPct };
        oil.brent = { usd: cachedOil.brent.usd, change24hPct: cachedOil.brent.change24hPct };
      }
    }

    // FX fallback
    if ((fx.EUR.usdPerUnit === 0 && fx.JPY.usdPerUnit === 0 && fx.GBP.usdPerUnit === 0) || fxData.status === "rejected") {
      if (fxCache && (now - fxCache.timestamp) < FX_CACHE_DURATION * 2) {
        console.log("Using cached FX data as fallback");
        fx = fxCache.data;
      } else if (marketsCache && marketsCache.data.fx) {
        console.log("Using FX data from general cache as fallback");
        const cachedFx = marketsCache.data.fx;
        fx.EUR = { usdPerUnit: cachedFx.EUR.usdPerUnit };
        fx.JPY = { usdPerUnit: cachedFx.JPY.usdPerUnit };
        fx.GBP = { usdPerUnit: cachedFx.GBP.usdPerUnit };
      }
    }

    // Convert to satoshis
    const result: MarketsSatsResponse = {
      btcUsd,
      timestamp: new Date().toISOString(),
      metals: {
        gold: {
          usd: metals.gold.usd,
          sats: metals.gold.usd > 0 ? usdToSats(metals.gold.usd, btcUsd) : 0,
          change24hPct: metals.gold.change24hPct,
        },
        silver: {
          usd: metals.silver.usd,
          sats: metals.silver.usd > 0 ? usdToSats(metals.silver.usd, btcUsd) : 0,
          change24hPct: metals.silver.change24hPct,
        },
        rateLimitInfo: metals.rateLimitInfo,
      },
      oil: {
        wti: {
          usd: oil.wti.usd,
          sats: oil.wti.usd > 0 ? usdToSats(oil.wti.usd, btcUsd) : 0,
          change24hPct: oil.wti.change24hPct,
        },
        brent: {
          usd: oil.brent.usd,
          sats: oil.brent.usd > 0 ? usdToSats(oil.brent.usd, btcUsd) : 0,
          change24hPct: oil.brent.change24hPct,
        },
      },
      fx: {
        EUR: {
          usdPerUnit: fx.EUR.usdPerUnit,
          satsPerUnit: fx.EUR.usdPerUnit > 0 ? usdToSats(fx.EUR.usdPerUnit, btcUsd) : 0,
        },
        JPY: {
          usdPerUnit: fx.JPY.usdPerUnit,
          satsPerUnit: fx.JPY.usdPerUnit > 0 ? usdToSats(fx.JPY.usdPerUnit, btcUsd) : 0,
        },
        GBP: {
          usdPerUnit: fx.GBP.usdPerUnit,
          satsPerUnit: fx.GBP.usdPerUnit > 0 ? usdToSats(fx.GBP.usdPerUnit, btcUsd) : 0,
        },
        USD: {
          usdPerUnit: 1.0, // USD is always 1.0
          satsPerUnit: usdToSats(1.0, btcUsd),
        },
      },
    };

    // Update cache
    marketsCache = {
      data: result,
      timestamp: now,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800", // 15 min cache
      },
    });
  } catch (error) {
    console.error("Error fetching markets data:", error);
    
    // Return cached data if available, even if expired, with stale flag
    if (marketsCache) {
      return NextResponse.json(
        { ...marketsCache.data, stale: true },
        {
          status: 200, // Still return 200, but mark as stale
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // If no cache, return error
    return NextResponse.json(
      { error: "Failed to fetch markets data", stale: true },
      { status: 500 }
    );
  }
}

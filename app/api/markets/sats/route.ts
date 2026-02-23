import { NextResponse } from "next/server";
import { getBTCPriceWithCache } from "@/lib/btc-cache";
import {
  canMakeMetalsRequest,
  incrementMetalsRequest,
  getMetalsRemainingRequests,
  getMetalsRequestsPerDay,
} from "@/lib/metals-rate-limit";

// ─── Pyth Network (Hermes REST API) ────────────────────────────────────────
// Docs: https://hermes.pyth.network/docs
// Sin API key, sin límite mensual. Rate limit: 30 req / 10 seg por IP.
// Con cache de 15 min solo hacemos 1 req/15min — muy por debajo del límite.
const PYTH_HERMES_URL = "https://hermes.pyth.network";

const PYTH_FEED_IDS = {
  // Metales — IDs estables (64 hex chars cada uno)
  gold:   "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2", // XAU/USD
  silver: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e", // XAG/USD
  // Petróleo — IDs deben tener 64 hex chars; los anteriores fallaban (WTI tenía 63)
  // Ver https://hermes.pyth.network/v2/price_feeds para IDs actuales
  wti:    "0x6a60b0d1ea6809b47dbe599f24a71c8bda335aa5c77e503e7260cde5ba2f4694", // WTI futures (spot no disponible en Pyth)
  brent:  "0xc96458d393fe9deb7a7d63a0ac41e2898a67a7750dbd166673279e06c868df0a", // BRENT/USD
} as const;

interface PythPriceData {
  price: string;   // precio crudo como string entero (ej: "316524000000")
  conf:  string;   // intervalo de confianza
  expo:  number;   // exponente: precio_real = parseInt(price) * 10^expo
  publish_time: number; // unix timestamp
}

interface PythParsedFeed {
  id: string;
  price: PythPriceData;
  ema_price: PythPriceData;
}

function parsePythPrice(data: PythPriceData): number {
  return parseInt(data.price) * Math.pow(10, data.expo);
}

// change24h: Pyth no lo provee nativamente.
// Calculamos comparando price vs ema_price como aproximación razonable.
// EMA price refleja el promedio reciente — la diferencia % es una buena proxy del cambio.
function approximateChange24h(current: PythPriceData, ema: PythPriceData): number | null {
  const currentPrice = parsePythPrice(current);
  const emaPrice = parsePythPrice(ema);
  if (emaPrice <= 0 || currentPrice <= 0) return null;
  return ((currentPrice - emaPrice) / emaPrice) * 100;
}

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

const MARKETS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes — Pyth: 30 req/10s por IP, 1 req/5min está muy por debajo
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
  // Solo usar cache si tiene valores válidos (> 0)
  if (metalsCache && (now - metalsCache.timestamp) < METALS_CACHE_DURATION) {
    const cachedGold = metalsCache.data.gold?.usd || 0;
    const cachedSilver = metalsCache.data.silver?.usd || 0;
    
    if (cachedGold > 0 || cachedSilver > 0) {
      console.log("Using cached Metals.dev data (valid values)");
      return {
        ...metalsCache.data,
        rateLimitInfo: {
          remaining: getMetalsRemainingRequests(),
          requestsPerDay: getMetalsRequestsPerDay(),
          limitReached: false,
        },
      };
    } else {
      console.warn("Cache exists but contains invalid values (both 0), fetching fresh data");
    }
  }
  
  // Verificar rate limit antes de hacer requests
  // Cada llamada consume 1 request (un solo endpoint devuelve todos los metales)
  const canMakeRequest = canMakeMetalsRequest();
  const remaining = getMetalsRemainingRequests();
  const requestsPerDay = getMetalsRequestsPerDay();
  
  if (!canMakeRequest || remaining < 1) {
    console.warn(`Metals.dev rate limit reached. Remaining: ${remaining}, Requests per day: ${requestsPerDay}`);
    // Si hay cache expirado, usarlo SOLO si tiene valores válidos
    if (metalsCache) {
      const cachedGold = metalsCache.data.gold?.usd || 0;
      const cachedSilver = metalsCache.data.silver?.usd || 0;
      
      if (cachedGold > 0 || cachedSilver > 0) {
        console.log("Using expired Metals cache due to rate limit (has valid values)");
        return {
          ...metalsCache.data,
          rateLimitInfo: {
            remaining,
            requestsPerDay,
            limitReached: true,
          },
        };
      } else {
        console.warn("Cache exists but contains invalid values (both 0), cannot use as fallback");
      }
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
    // Usar apiUrl si está disponible, sino usar baseUrl por defecto
    const baseUrl = apiUrl && apiUrl.trim() ? apiUrl.replace(/\/$/, '') : 'https://api.metals.dev';
    const url = `${baseUrl}/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`;
    
    console.log("Metals API URL:", url.replace(apiKey, '***'));
    
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
      let errorMessage = `Metals API error ${response.status}`;
      
      // Intentar parsear el error como JSON si es posible
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        console.error(`Metals API error ${response.status}:`, errorJson);
      } catch {
        console.error(`Metals API error ${response.status}:`, errorText.substring(0, 200));
      }
      
      // Si es un error de autenticación o rate limit, no incrementar el contador
      if (response.status === 401 || response.status === 403) {
        console.error("Metals API authentication failed - check API key");
      } else if (response.status === 429) {
        console.error("Metals API rate limit exceeded");
        // Marcar que el límite fue alcanzado
        incrementMetalsRequest(); // Incrementar para reflejar el intento
      }
      
      throw new Error(errorMessage);
    }

    const json = await response.json();
    
    // Debug: Log raw API response completo para diagnóstico
    console.log("Metals.dev full response:", JSON.stringify(json, null, 2));
    console.log("Metals.dev response keys:", Object.keys(json));
    if (json.metals) {
      console.log("Metals.dev metals keys:", Object.keys(json.metals));
      console.log("Metals.dev metals values:", {
        gold: json.metals.gold,
        goldType: typeof json.metals.gold,
        silver: json.metals.silver,
        silverType: typeof json.metals.silver,
      });
    }
    
    // Verificar si la respuesta tiene status de error
    if (json.status === "error" || json.status === "failure") {
      const errorMsg = json.message || json.error || "Unknown error from Metals.dev API";
      console.error("Metals.dev API returned error:", errorMsg);
      throw new Error(`Metals.dev API error: ${errorMsg}`);
    }
    
    // Verificar que la respuesta tenga la estructura esperada
    if (!json.metals || typeof json.metals !== "object") {
      console.error("Metals.dev API response missing 'metals' object. Full response:", JSON.stringify(json, null, 2));
      throw new Error("Invalid Metals.dev API response format: missing 'metals' object");
    }
    
    // Incrementar contador (1 request para todos los metales)
    incrementMetalsRequest();
    
    const newRemaining = getMetalsRemainingRequests();
    const newRequestsPerDay = getMetalsRequestsPerDay();
    
    // Metals.dev response format: { status: "success", metals: { gold: number, silver: number, ... } }
    // Los precios están directamente en json.metals.gold y json.metals.silver como números
    const metals = json.metals || {};
    const goldPrice = metals.gold;
    const silverPrice = metals.silver;
    
    // Log valores raw antes de parsear
    console.log("Raw metals prices from API:", {
      goldPrice,
      goldPriceType: typeof goldPrice,
      silverPrice,
      silverPriceType: typeof silverPrice,
    });
    
    // Validar que los precios sean números válidos
    const goldUsd = goldPrice != null && !isNaN(Number(goldPrice)) && Number(goldPrice) > 0 
      ? parseFloat(String(goldPrice)) 
      : 0;
    const silverUsd = silverPrice != null && !isNaN(Number(silverPrice)) && Number(silverPrice) > 0 
      ? parseFloat(String(silverPrice)) 
      : 0;
    
    // Metals.dev no proporciona change_24h en el endpoint /v1/latest, solo precios
    const goldChange = null;
    const silverChange = null;
    
    console.log("Parsed metals:", { goldUsd, silverUsd, goldChange, silverChange });
    
    // Si los precios son 0 o inválidos, lanzar error para usar cache (si existe y es válido)
    if (goldUsd <= 0 && silverUsd <= 0) {
      console.warn("⚠️ Metals.dev API returned invalid prices (both zero or invalid)");
      console.warn("Raw response metals object:", metals);
      // No lanzar error inmediatamente - verificar si hay cache válido primero
      if (metalsCache && metalsCache.data.gold.usd > 0) {
        console.log("Using cached metals data instead of invalid API response");
        return {
          ...metalsCache.data,
          rateLimitInfo: {
            remaining: newRemaining,
            requestsPerDay: newRequestsPerDay,
            limitReached: false,
          },
        };
      }
      throw new Error("Invalid metals prices from API and no valid cache available");
    }
    
    const result = {
      gold: {
        usd: goldUsd,
        change24hPct: goldChange !== null ? parseFloat(String(goldChange)) : null,
      },
      silver: {
        usd: silverUsd,
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
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    
    // Si hay cache disponible (incluso expirado), usarlo SOLO si tiene valores válidos
    if (metalsCache) {
      const cachedGold = metalsCache.data.gold?.usd || 0;
      const cachedSilver = metalsCache.data.silver?.usd || 0;
      
      if (cachedGold > 0 || cachedSilver > 0) {
        console.log("Using expired Metals cache due to error (has valid values)");
        return {
          ...metalsCache.data,
          rateLimitInfo: {
            remaining,
            requestsPerDay,
            limitReached: false,
          },
        };
      } else {
        console.warn("Cache exists but contains invalid values (both 0), cannot use as fallback");
      }
    }
    
    // Return zeros on error - caller will handle stale data
    console.warn("⚠️ Returning zero values for metals - no valid cache available");
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

/**
 * Fetch Gold, Silver, WTI y Brent desde Pyth Network (Hermes REST API)
 * Sin API key. Rate limit: 30 req/10seg por IP — muy holgado con cache de 15min.
 *
 * Reemplaza fetchMetals() y fetchOil() en una sola llamada HTTP.
 */
async function fetchPyth(): Promise<{
  gold:   { usd: number; change24hPct: number | null };
  silver: { usd: number; change24hPct: number | null };
  wti:    { usd: number; change24hPct: number | null };
  brent:  { usd: number; change24hPct: number | null };
}> {
  const defaultResult = {
    gold:   { usd: 0, change24hPct: null },
    silver: { usd: 0, change24hPct: null },
    wti:    { usd: 0, change24hPct: null },
    brent:  { usd: 0, change24hPct: null },
  };

  try {
    // Pyth Hermes acepta IDs con o sin 0x; usar sin 0x evita problemas de encoding en algunos entornos
    const ids = Object.values(PYTH_FEED_IDS).map((id) =>
      id.startsWith("0x") ? id.slice(2) : id
    );
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids[]", id));
    params.append("parsed", "true");

    const url = `${PYTH_HERMES_URL}/v2/updates/price/latest?${params}`;

    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Pyth Hermes HTTP error:", response.status, errText.slice(0, 300));
      throw new Error(`Pyth Hermes error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { parsed?: PythParsedFeed[] };

    if (!data.parsed || !Array.isArray(data.parsed)) {
      console.error("Pyth response missing parsed array. Keys:", data ? Object.keys(data) : "null");
      throw new Error("Pyth response missing 'parsed' array");
    }

    const feeds: PythParsedFeed[] = data.parsed;

    // Mapear cada feed por ID; la API devuelve id sin 0x — guardamos con y sin 0x para lookup seguro
    const byId = new Map<string, PythParsedFeed>();
    feeds.forEach(feed => {
      const raw = (feed.id.startsWith("0x") ? feed.id.slice(2) : feed.id).toLowerCase();
      const withPrefix = `0x${raw}`;
      byId.set(withPrefix, feed);
      byId.set(raw, feed);
    });

    const get = (key: keyof typeof PYTH_FEED_IDS) => {
      const id = PYTH_FEED_IDS[key].toLowerCase();
      const withPrefix = id.startsWith("0x") ? id : `0x${id}`;
      const withoutPrefix = withPrefix.replace(/^0x/, "");
      return byId.get(withPrefix) ?? byId.get(withoutPrefix) ?? null;
    };

    const goldFeed   = get("gold");
    const silverFeed = get("silver");
    const wtiFeed    = get("wti");
    const brentFeed  = get("brent");

    const result = {
      gold: goldFeed
        ? { usd: parsePythPrice(goldFeed.price), change24hPct: approximateChange24h(goldFeed.price, goldFeed.ema_price) }
        : defaultResult.gold,
      silver: silverFeed
        ? { usd: parsePythPrice(silverFeed.price), change24hPct: approximateChange24h(silverFeed.price, silverFeed.ema_price) }
        : defaultResult.silver,
      wti: wtiFeed
        ? { usd: parsePythPrice(wtiFeed.price), change24hPct: approximateChange24h(wtiFeed.price, wtiFeed.ema_price) }
        : defaultResult.wti,
      brent: brentFeed
        ? { usd: parsePythPrice(brentFeed.price), change24hPct: approximateChange24h(brentFeed.price, brentFeed.ema_price) }
        : defaultResult.brent,
    };

    console.log("Pyth prices fetched:", {
      gold:   result.gold.usd,
      silver: result.silver.usd,
      wti:    result.wti.usd,
      brent:  result.brent.usd,
    });

    return result;

  } catch (error) {
    console.error("Error fetching Pyth data:", error);
    return defaultResult;
  }
}

export async function GET() {
  const now = Date.now();

  // Solo usar cache si tiene datos válidos de metals (evita devolver cache con ceros)
  if (
    marketsCache &&
    (now - marketsCache.timestamp) < MARKETS_CACHE_DURATION &&
    (marketsCache.data.metals?.gold?.usd > 0 || marketsCache.data.metals?.silver?.usd > 0)
  ) {
    return NextResponse.json(marketsCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  try {
    // Get environment variables
    const fxApiUrl = process.env.FX_API_URL;
    const fxApiKey = process.env.FX_API_KEY;

    // Debug: Log environment variables (sin mostrar keys completas)
    const configStatus = {
      fxApiUrl: fxApiUrl ? "✓ Set" : "✗ Missing",
      fxApiKey: fxApiKey ? "✓ Set" : "✗ Missing",
    };
    console.log("Markets API Config:", configStatus);

    // Fetch BTC price first (or use cached version from Roxom)
    const btcUsd = await getBTCPrice();
    
    if (!btcUsd || btcUsd <= 0) {
      throw new Error("Invalid BTC price");
    }
    
    console.log("BTC Price fetched:", btcUsd);

    // Pyth + FX en paralelo
    const [pythData, fxData] = await Promise.allSettled([
      fetchPyth(), // Una sola llamada trae Gold, Silver, WTI y Brent
      fxApiUrl
        ? fetchFX(fxApiUrl, fxApiKey)
        : Promise.resolve({ EUR: { usdPerUnit: 0 }, JPY: { usdPerUnit: 0 }, GBP: { usdPerUnit: 0 } }),
    ]);

    // Extraer con fallback a cero
    const pyth = pythData.status === "fulfilled"
      ? pythData.value
      : { gold: { usd: 0, change24hPct: null }, silver: { usd: 0, change24hPct: null }, wti: { usd: 0, change24hPct: null }, brent: { usd: 0, change24hPct: null } };

    let fx = fxData.status === "fulfilled"
      ? fxData.value
      : { EUR: { usdPerUnit: 0 }, JPY: { usdPerUnit: 0 }, GBP: { usdPerUnit: 0 } };

    // Usar variables con el shape que ya espera el resto del código
    let metals: {
      gold: { usd: number; change24hPct: number | null };
      silver: { usd: number; change24hPct: number | null };
      rateLimitInfo?: { remaining: number; requestsPerDay: number; limitReached: boolean };
    } = {
      gold:   { usd: pyth.gold.usd,   change24hPct: pyth.gold.change24hPct },
      silver: { usd: pyth.silver.usd, change24hPct: pyth.silver.change24hPct },
    };
    let oil = {
      wti:   { usd: pyth.wti.usd,   change24hPct: pyth.wti.change24hPct },
      brent: { usd: pyth.brent.usd, change24hPct: pyth.brent.change24hPct },
    };

    if (pythData.status === "rejected") {
      console.error("Pyth fetch failed:", pythData.reason);
    }
    if (fxData.status === "rejected") {
      console.error("FX fetch failed:", fxData.reason);
    }

    // Fallback: Use individual cache if API failed or returned zeros
    // Metals fallback - SOLO usar cache si tiene valores válidos (> 0)
    if ((metals.gold.usd === 0 && metals.silver.usd === 0) || pythData.status === "rejected") {
      if (metalsCache && (now - metalsCache.timestamp) < METALS_CACHE_DURATION * 2) {
        const cachedGold = metalsCache.data.gold?.usd || 0;
        const cachedSilver = metalsCache.data.silver?.usd || 0;
        
        if (cachedGold > 0 || cachedSilver > 0) {
          // Use cache even if expired (up to 2x duration) as fallback
          console.log("Using cached metals data as fallback (has valid values)");
          metals = metalsCache.data;
        } else {
          console.warn("Metals cache exists but contains invalid values (both 0), skipping fallback");
        }
      } else if (marketsCache && marketsCache.data.metals) {
        // Fallback to general cache if individual cache not available
        const cachedMetals = marketsCache.data.metals;
        const cachedGold = cachedMetals.gold?.usd || 0;
        const cachedSilver = cachedMetals.silver?.usd || 0;
        
        if (cachedGold > 0 || cachedSilver > 0) {
          console.log("Using metals data from general cache as fallback (has valid values)");
          metals.gold = { usd: cachedMetals.gold.usd, change24hPct: cachedMetals.gold.change24hPct };
          metals.silver = { usd: cachedMetals.silver.usd, change24hPct: cachedMetals.silver.change24hPct };
        } else {
          console.warn("General cache metals data is invalid (both 0), skipping fallback");
        }
      }
    }

    // Oil fallback
    if ((oil.wti.usd === 0 && oil.brent.usd === 0) || pythData.status === "rejected") {
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
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // 5 min cache
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

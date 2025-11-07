import { NextRequest, NextResponse } from 'next/server';

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || '8084cf3a16a449caba286882cb101c28';
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

interface TwelveDataQuote {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
}

interface MarketDataResponse {
  symbol: string;
  name: string;
  value: number;
  change: number; // porcentaje
  changeAmount: number; // valor absoluto
  changeType?: string; // 'intraday', '24h', 'daily', etc.
}

// Rate Limiter: Máximo 8 requests por minuto Y 800 requests por día (límite del plan gratuito)
const rateLimiter = {
  requests: [] as number[],
  dailyRequests: [] as number[],
  maxRequestsPerMinute: 8,
  maxRequestsPerDay: 800,
  timeWindow: 60000, // 1 minuto en milisegundos
  dayWindow: 86400000, // 24 horas en milisegundos
};

function canMakeRequest(): boolean {
  const now = Date.now();
  
  // Limpiar requests antiguos (fuera de la ventana de 1 minuto)
  rateLimiter.requests = rateLimiter.requests.filter(
    timestamp => now - timestamp < rateLimiter.timeWindow
  );
  
  // Limpiar requests antiguos del día (fuera de las últimas 24 horas)
  rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(
    timestamp => now - timestamp < rateLimiter.dayWindow
  );
  
  // Verificar ambos límites
  const withinMinuteLimit = rateLimiter.requests.length < rateLimiter.maxRequestsPerMinute;
  const withinDayLimit = rateLimiter.dailyRequests.length < rateLimiter.maxRequestsPerDay;
  
  return withinMinuteLimit && withinDayLimit;
}

function registerRequest(): void {
  const now = Date.now();
  rateLimiter.requests.push(now);
  rateLimiter.dailyRequests.push(now);
}

// Cache simple en memoria (15 minutos para optimizar uso de API gratuita)
// IMPORTANTE: Este cache es compartido entre TODOS los clientes que usen el mismo servidor
// Si cada computadora corre su propio servidor (npm run dev), cada una tendrá su propio cache
// Para producción, usar un solo servidor desplegado (Vercel, etc.) para compartir cache y rate limiter
//
// Plan gratuito: 8 créditos/min, 800 créditos/día
// 
// Estrategia:
// - Rate limiter: máximo 8 requests/minuto Y 800 requests/día (compartido entre todos los clientes)
// - Cache de 15 minutos previene actualizaciones innecesarias (compartido entre todos los clientes)
// - Las requests se distribuyen a lo largo del tiempo
// - Múltiples clientes comparten el mismo cache y rate limiter si usan el mismo servidor
const cache = new Map<string, { data: MarketDataResponse; timestamp: number }>();
const CACHE_DURATION = 900000; // 15 minutos (900 segundos)

async function fetchFromTwelveData(symbol: string): Promise<MarketDataResponse | null> {
  try {
    // Verificar cache primero
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Verificar rate limit antes de hacer la request
    if (!canMakeRequest()) {
      console.warn(`Rate limit reached, using cached data for ${symbol}`);
      // Si hay datos en cache aunque estén vencidos, usarlos
      if (cached) {
        return cached.data;
      }
      return null;
    }

    // Registrar la request
    registerRequest();

    const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url, {
      next: { revalidate: 900 }, // Revalidar cada 15 minutos (900 segundos)
    });

    if (!response.ok) {
      console.error(`Twelve Data API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data: TwelveDataQuote = await response.json();

    // Verificar que la respuesta tenga los datos necesarios
    if (!data || typeof data !== 'object') {
      console.error(`Invalid response format for ${symbol}`);
      return null;
    }

    // Verificar campos requeridos
    if (!data.close || data.close === 'N/A' || !data.previous_close || data.previous_close === 'N/A' || !data.percent_change || data.percent_change === 'N/A') {
      console.error(`Incomplete or invalid data for ${symbol}:`, {
        close: data.close,
        previous_close: data.previous_close,
        percent_change: data.percent_change
      });
      return null;
    }

    // Parsear valores numéricos
    const currentPrice = parseFloat(data.close);
    const previousPrice = parseFloat(data.previous_close);
    const percentChange = parseFloat(data.percent_change);

    // Validar que los valores sean números válidos
    if (isNaN(currentPrice) || isNaN(previousPrice) || isNaN(percentChange)) {
      console.error(`Invalid numeric values for ${symbol}:`, {
        currentPrice,
        previousPrice,
        percentChange
      });
      return null;
    }

    const changeAmount = currentPrice - previousPrice;

    // Determinar el tipo de cambio basado en la fecha/hora
    // Twelve Data quote generalmente devuelve cambio desde el cierre anterior (daily)
    // Para mercados abiertos puede ser intraday, para cerrados es daily
    const now = new Date();
    const hour = now.getUTCHours();
    const isMarketHours = (hour >= 13 && hour < 20); // Aproximadamente horas de mercado US (UTC)
    
    // Determinar tipo de cambio
    let changeType = 'daily'; // Por defecto daily (cierre a cierre)
    if (data.datetime) {
      const quoteTime = new Date(data.datetime);
      const timeDiff = now.getTime() - quoteTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        changeType = isMarketHours ? 'intraday' : '24h';
      } else {
        changeType = 'daily';
      }
    }

    const result: MarketDataResponse = {
      symbol: symbol,
      name: data.name || symbol,
      value: currentPrice,
      change: percentChange,
      changeAmount: changeAmount,
      changeType: changeType,
    };

    // Actualizar cache
    cache.set(symbol, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbols = searchParams.get('symbols');

  if (!symbols) {
    return NextResponse.json(
      { error: 'Symbols parameter is required' },
      { status: 400 }
    );
  }

  const symbolList = symbols.split(',').map(s => s.trim());

  try {
    // Procesar símbolos respetando el rate limit de 8/min
    const results: (MarketDataResponse | null)[] = [];
    
    for (const symbol of symbolList) {
      // fetchFromTwelveData ya maneja cache y rate limit internamente
      const result = await fetchFromTwelveData(symbol);
      results.push(result);
    }

    // Filtrar nulls y retornar
    const validResults = results.filter((r): r is MarketDataResponse => r !== null);

    const now = Date.now();
    // Limpiar requests antiguos antes de calcular remaining
    rateLimiter.requests = rateLimiter.requests.filter(
      timestamp => now - timestamp < rateLimiter.timeWindow
    );
    rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(
      timestamp => now - timestamp < rateLimiter.dayWindow
    );

    return NextResponse.json({
      data: validResults,
      timestamp: now,
      rateLimitInfo: {
        remainingPerMinute: Math.max(0, rateLimiter.maxRequestsPerMinute - rateLimiter.requests.length),
        remainingPerDay: Math.max(0, rateLimiter.maxRequestsPerDay - rateLimiter.dailyRequests.length),
        usedPerMinute: rateLimiter.requests.length,
        usedPerDay: rateLimiter.dailyRequests.length,
        warning: rateLimiter.dailyRequests.length > 600 ? 'Approaching daily limit' : undefined,
      },
    });
  } catch (error) {
    console.error('Error in market-data API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}


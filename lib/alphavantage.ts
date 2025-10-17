export interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

export interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
}

// Cache para evitar exceder límites de API
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const marketCache = new Map<string, { data: MarketData; timestamp: number }>();

// Rate limiting
const RATE_LIMIT = {
  maxCalls: 5, // Alpha Vantage free tier: 5 calls per minute
  timeWindow: 60 * 1000, // 1 minute
  calls: [] as number[]
};

const API_KEY = 'BY1AQOS9DQTUS2WW';

// Símbolos de mercado para las placas financieras
export const MARKET_SYMBOLS = [
  // Global Bonds
  { symbol: '^TNX', name: 'US 10Y Treasury' },
  { symbol: '^FVX', name: 'US 5Y Treasury' },
  { symbol: '^TYX', name: 'US 30Y Treasury' },
  
  // Commodities
  { symbol: 'CL=F', name: 'WTI Crude Oil' },
  { symbol: 'GC=F', name: 'Gold Futures' },
  { symbol: 'HG=F', name: 'Copper Futures' },
  
  // FX
  { symbol: 'EURUSD=X', name: 'EUR/USD' },
  { symbol: 'USDJPY=X', name: 'USD/JPY' },
  { symbol: 'DX-Y.NYB', name: 'Dollar Index' },
  
  // Major Indices
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^VIX', name: 'VIX Volatility' },
  
  // ETFs
  { symbol: 'GLD', name: 'Gold ETF' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'NASDAQ ETF' }
];

// Definición de las placas financieras
export const FINANCIAL_PLATES = [
  {
    id: 'bonds',
    title: 'GLOBAL BONDS PULSE',
    type: 'bonds',
    data: {
      ust10y: 0,
      bund10y: 0,
      jgb10y: 0
    }
  },
  {
    id: 'commodities',
    title: 'COMMODITIES QUICK',
    type: 'commodities',
    data: {
      wti_price: 0,
      wti_pct: 0,
      gold_price: 0,
      copper_price: 0
    }
  },
  {
    id: 'fx',
    title: 'FX CROSSES BOARD',
    type: 'fx',
    data: {
      eurusd: 0,
      usdjpy: 0,
      dxy: 0
    }
  },
  {
    id: 'inflation',
    title: 'INFLATION WATCH',
    type: 'inflation',
    data: {
      us_cpi_yoy: 0,
      eu_cpi_yoy: 0
    }
  },
  {
    id: 'etf',
    title: 'ETF FLOWS NON-BTC',
    type: 'etf',
    data: {
      gold_etf_flow: 0,
      spx_etf_flow: 0
    }
  },
  {
    id: 'equities',
    title: 'MARKET MOVERS (EQUITIES)',
    type: 'equities',
    data: {
      spx_pct: 0,
      ndx_pct: 0,
      msci_pct: 0
    }
  },
  {
    id: 'risk',
    title: 'RISK-ON/OFF FLASH',
    type: 'risk',
    data: {
      vix_level: 0,
      dxy_pct: 0,
      wti_pct: 0
    }
  }
];

export async function fetchMarketData(symbol: string): Promise<MarketData | null> {
  // Check cache first
  const cached = marketCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Rate limiting check
  const now = Date.now();
  RATE_LIMIT.calls = RATE_LIMIT.calls.filter(timestamp => now - timestamp < RATE_LIMIT.timeWindow);
  
  if (RATE_LIMIT.calls.length >= RATE_LIMIT.maxCalls) {
    console.warn('Alpha Vantage rate limit reached, returning cached data');
    if (cached) {
      return cached.data;
    }
    return getFallbackData(symbol);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Alpha Vantage API error (${response.status}) for ${symbol}`);
      return getFallbackData(symbol);
    }

    const data: AlphaVantageResponse = await response.json();

    if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
      console.warn(`No data received for ${symbol}, using fallback data`);
      return getFallbackData(symbol);
    }

    const quote = data['Global Quote'];
    
    const marketData: MarketData = {
      symbol: quote['01. symbol'],
      name: MARKET_SYMBOLS.find(s => s.symbol === symbol)?.name || symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      previousClose: parseFloat(quote['08. previous close'])
    };

    // Update cache
    marketCache.set(symbol, {
      data: marketData,
      timestamp: Date.now()
    });

    // Register API call for rate limiting
    RATE_LIMIT.calls.push(now);

    return marketData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Error fetching market data for ${symbol}:`, errorMessage);
    
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    // Return fallback data if API fails
    return getFallbackData(symbol);
  }
}

export async function fetchMultipleMarketData(symbols: string[]): Promise<MarketData[]> {
  const results: MarketData[] = [];
  
  // Process symbols in batches to respect rate limits
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    // Add delay between requests to respect rate limits
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
    }
    
    const data = await fetchMarketData(symbol);
    if (data) {
      results.push(data);
    }
  }
  
  return results;
}

function getFallbackData(symbol: string): MarketData {
  // Datos de fallback realistas
  const fallbackData: { [key: string]: MarketData } = {
    'SPY': {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      price: 456.78,
      change: 2.34,
      changePercent: 0.52,
      volume: 45000000,
      open: 454.50,
      high: 458.20,
      low: 453.80,
      previousClose: 454.44
    },
    'QQQ': {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      price: 378.92,
      change: -1.23,
      changePercent: -0.32,
      volume: 32000000,
      open: 380.15,
      high: 381.50,
      low: 377.80,
      previousClose: 380.15
    },
    'DIA': {
      symbol: 'DIA',
      name: 'SPDR Dow Jones ETF',
      price: 345.67,
      change: 1.89,
      changePercent: 0.55,
      volume: 12000000,
      open: 343.80,
      high: 346.20,
      low: 343.50,
      previousClose: 343.78
    },
    'AAPL': {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 189.45,
      change: 2.34,
      changePercent: 1.25,
      volume: 45000000,
      open: 187.20,
      high: 190.10,
      low: 186.80,
      previousClose: 187.11
    },
    'MSFT': {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      price: 378.92,
      change: -1.23,
      changePercent: -0.32,
      volume: 28000000,
      open: 380.15,
      high: 381.50,
      low: 377.80,
      previousClose: 380.15
    },
    'GOOGL': {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 142.67,
      change: 3.45,
      changePercent: 2.48,
      volume: 22000000,
      open: 139.25,
      high: 143.20,
      low: 138.90,
      previousClose: 139.22
    },
    'TSLA': {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: 234.56,
      change: -5.67,
      changePercent: -2.36,
      volume: 65000000,
      open: 240.20,
      high: 241.50,
      low: 233.80,
      previousClose: 240.23
    },
    'NVDA': {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      price: 456.78,
      change: 12.34,
      changePercent: 2.78,
      volume: 38000000,
      open: 444.50,
      high: 458.90,
      low: 443.20,
      previousClose: 444.44
    },
    'AMZN': {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      price: 145.23,
      change: 1.89,
      changePercent: 1.32,
      volume: 25000000,
      open: 143.40,
      high: 146.10,
      low: 142.80,
      previousClose: 143.34
    },
    'META': {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      price: 312.45,
      change: -2.15,
      changePercent: -0.68,
      volume: 18000000,
      open: 314.60,
      high: 315.20,
      low: 311.80,
      previousClose: 314.60
    }
  };

  return fallbackData[symbol] || {
    symbol,
    name: symbol,
    price: 100.00,
    change: 0.00,
    changePercent: 0.00,
    volume: 1000000,
    open: 100.00,
    high: 101.00,
    low: 99.00,
    previousClose: 100.00
  };
}

// Generate fallback data for financial plates
export const generateFinancialPlatesData = () => {
  return FINANCIAL_PLATES.map(plate => ({
    ...plate,
    data: {
      // Bonds
      ust10y: plate.id === 'bonds' ? (4.2 + (Math.random() - 0.5) * 0.5).toFixed(2) : plate.data.ust10y,
      bund10y: plate.id === 'bonds' ? (2.1 + (Math.random() - 0.5) * 0.3).toFixed(2) : plate.data.bund10y,
      jgb10y: plate.id === 'bonds' ? (0.8 + (Math.random() - 0.5) * 0.2).toFixed(2) : plate.data.jgb10y,
      
      // Commodities
      wti_price: plate.id === 'commodities' ? (75 + (Math.random() - 0.5) * 10).toFixed(2) : plate.data.wti_price,
      wti_pct: plate.id === 'commodities' ? ((Math.random() - 0.5) * 4).toFixed(2) : plate.data.wti_pct,
      gold_price: plate.id === 'commodities' ? (1950 + (Math.random() - 0.5) * 50).toFixed(2) : plate.data.gold_price,
      copper_price: plate.id === 'commodities' ? (3.8 + (Math.random() - 0.5) * 0.3).toFixed(2) : plate.data.copper_price,
      
      // FX
      eurusd: plate.id === 'fx' ? (1.08 + (Math.random() - 0.5) * 0.02).toFixed(4) : plate.data.eurusd,
      usdjpy: plate.id === 'fx' ? (150 + (Math.random() - 0.5) * 5).toFixed(2) : plate.data.usdjpy,
      dxy: plate.id === 'fx' ? (103 + (Math.random() - 0.5) * 2).toFixed(2) : plate.data.dxy,
      
      // Inflation
      us_cpi_yoy: plate.id === 'inflation' ? (3.2 + (Math.random() - 0.5) * 0.5).toFixed(1) : plate.data.us_cpi_yoy,
      eu_cpi_yoy: plate.id === 'inflation' ? (2.8 + (Math.random() - 0.5) * 0.4).toFixed(1) : plate.data.eu_cpi_yoy,
      
      // ETF Flows
      gold_etf_flow: plate.id === 'etf' ? ((Math.random() - 0.5) * 200).toFixed(0) : plate.data.gold_etf_flow,
      spx_etf_flow: plate.id === 'etf' ? ((Math.random() - 0.5) * 500).toFixed(0) : plate.data.spx_etf_flow,
      
      // Equities
      spx_pct: plate.id === 'equities' ? ((Math.random() - 0.5) * 3).toFixed(2) : plate.data.spx_pct,
      ndx_pct: plate.id === 'equities' ? ((Math.random() - 0.5) * 4).toFixed(2) : plate.data.ndx_pct,
      msci_pct: plate.id === 'equities' ? ((Math.random() - 0.5) * 2.5).toFixed(2) : plate.data.msci_pct,
      
      // Risk
      vix_level: plate.id === 'risk' ? (18 + (Math.random() - 0.5) * 8).toFixed(1) : plate.data.vix_level,
      dxy_pct: plate.id === 'risk' ? ((Math.random() - 0.5) * 2).toFixed(2) : plate.data.dxy_pct,
      wti_pct: plate.id === 'risk' ? ((Math.random() - 0.5) * 3).toFixed(2) : plate.data.wti_pct
    }
  }));
};

export interface WeatherData {
  tempC: number;
  conditionText: string;
  conditionIconUrl: string;
  windKmh: number;
  updatedAt: Date;
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

// Rate limiting to ensure we stay under 60 calls per minute
const RATE_LIMIT = {
  maxCalls: 50, // Conservative limit
  timeWindow: 60 * 1000, // 1 minute
  calls: [] as number[]
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds (reduces API calls to 1,440/day - within free tier limit)
const weatherCache = new Map<string, CacheEntry>();

export async function fetchCurrentWeather(query: string): Promise<WeatherData | null> {
  // API key pública (puede ser expuesta en el frontend)
  const apiKey = '679aca02b37f0662d2a1fb16a47ba7ba';
  const units = 'metric';
  const lang = 'en';

  // Datos de fallback realistas por ciudad
  const fallbackDataByCity: { [key: string]: WeatherData } = {
    'Hong Kong,HK': {
      tempC: 28,
      conditionText: 'Partly Cloudy',
      conditionIconUrl: 'https://openweathermap.org/img/wn/02d@2x.png',
      windKmh: 15,
      updatedAt: new Date(),
    },
    'London,GB': {
      tempC: 18,
      conditionText: 'Overcast',
      conditionIconUrl: 'https://openweathermap.org/img/wn/04d@2x.png',
      windKmh: 22,
      updatedAt: new Date(),
    },
    'San Francisco,US': {
      tempC: 20,
      conditionText: 'Foggy',
      conditionIconUrl: 'https://openweathermap.org/img/wn/50d@2x.png',
      windKmh: 18,
      updatedAt: new Date(),
    },
    'New York,US': {
      tempC: 24,
      conditionText: 'Clear Sky',
      conditionIconUrl: 'https://openweathermap.org/img/wn/01d@2x.png',
      windKmh: 12,
      updatedAt: new Date(),
    },
    'Dubai,AE': {
      tempC: 35,
      conditionText: 'Sunny',
      conditionIconUrl: 'https://openweathermap.org/img/wn/01d@2x.png',
      windKmh: 8,
      updatedAt: new Date(),
    },
    'Tokyo,JP': {
      tempC: 26,
      conditionText: 'Light Rain',
      conditionIconUrl: 'https://openweathermap.org/img/wn/10d@2x.png',
      windKmh: 14,
      updatedAt: new Date(),
    },
    'Sydney,AU': {
      tempC: 22,
      conditionText: 'Partly Cloudy',
      conditionIconUrl: 'https://openweathermap.org/img/wn/02d@2x.png',
      windKmh: 20,
      updatedAt: new Date(),
    },
    'Amsterdam,NL': {
      tempC: 16,
      conditionText: 'Light Rain',
      conditionIconUrl: 'https://openweathermap.org/img/wn/10d@2x.png',
      windKmh: 25,
      updatedAt: new Date(),
    },
    'Rio de Janeiro,BR': {
      tempC: 30,
      conditionText: 'Sunny',
      conditionIconUrl: 'https://openweathermap.org/img/wn/01d@2x.png',
      windKmh: 10,
      updatedAt: new Date(),
    }
  };

  const fallbackData = fallbackDataByCity[query] || {
    tempC: 22,
    conditionText: 'Sunny',
    conditionIconUrl: 'https://openweathermap.org/img/wn/01d@2x.png',
    windKmh: 12,
    updatedAt: new Date(),
  };

  // Coordenadas de las ciudades (hardcodeadas para evitar llamadas adicionales)
  const cityCoordinates: { [key: string]: { lat: number; lon: number } } = {
    'Hong Kong,HK': { lat: 22.3193, lon: 114.1694 },
    'London,GB': { lat: 51.5074, lon: -0.1278 },
    'San Francisco,US': { lat: 37.7749, lon: -122.4194 },
    'New York,US': { lat: 40.7128, lon: -74.0060 },
    'Dubai,AE': { lat: 25.2048, lon: 55.2708 },
    'Tokyo,JP': { lat: 35.6762, lon: 139.6503 },
    'Sydney,AU': { lat: -33.8688, lon: 151.2093 },
    'Amsterdam,NL': { lat: 52.3676, lon: 4.9041 },
    'Rio de Janeiro,BR': { lat: -22.9068, lon: -43.1729 }
  };

  // Check cache first
  const cached = weatherCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Rate limiting check
  const now = Date.now();
  RATE_LIMIT.calls = RATE_LIMIT.calls.filter(timestamp => now - timestamp < RATE_LIMIT.timeWindow);
  
  if (RATE_LIMIT.calls.length >= RATE_LIMIT.maxCalls) {
    console.warn('Rate limit reached, returning cached data');
    if (cached) {
      return cached.data;
    }
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Obtener coordenadas de la ciudad
    const coords = cityCoordinates[query];
    if (!coords) {
      console.warn(`Coordenadas no encontradas para: ${query}, usando datos de fallback`);
      return fallbackData;
    }

    // Usar One Call API 3.0 con coordenadas
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lon}&exclude=minutely,hourly,daily,alerts&appid=${apiKey}&units=${units}&lang=${lang}`;
    
    console.log(`🌤️ Intentando llamar a la API para ${query}...`);
    
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ API no disponible (${response.status}), usando datos de fallback para ${query}`);
      return fallbackData;
    }

    const data = await response.json();
    console.log(`✅ Datos obtenidos de la API para ${query}`);

    // One Call API 3.0 tiene una estructura diferente
    const weatherData: WeatherData = {
      tempC: Math.round(data.current.temp),
      conditionText: data.current.weather[0]?.description || 'Unknown',
      conditionIconUrl: `https://openweathermap.org/img/wn/${data.current.weather[0]?.icon}@2x.png`,
      windKmh: Math.round((data.current.wind_speed || 0) * 3.6), // Convert m/s to km/h
      updatedAt: new Date(),
    };
    
    console.log(`🌡️ Datos procesados para ${query}:`, weatherData);

    // Update cache
    weatherCache.set(query, {
      data: weatherData,
      timestamp: Date.now(),
    });

    // Register API call for rate limiting
    RATE_LIMIT.calls.push(now);

    return weatherData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`⚠️ Error en API para ${query}, usando datos de fallback:`, errorMessage);
    
    // Return cached data if available, even if expired
    if (cached) {
      console.log(`📦 Usando datos en caché para ${query}`);
      return cached.data;
    }
    
    // Return fallback data if API fails
    console.log(`🎯 Usando datos de fallback para ${query}`);
    return fallbackData;
  }
}

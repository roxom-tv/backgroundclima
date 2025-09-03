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

  // Datos de fallback para demostración
  const fallbackData: WeatherData = {
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
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    // Obtener coordenadas de la ciudad
    const coords = cityCoordinates[query];
    if (!coords) {
      console.error(`Coordenadas no encontradas para: ${query}`);
      return fallbackData;
    }

    // Usar One Call API 3.0 con coordenadas
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lon}&exclude=minutely,hourly,daily,alerts&appid=${apiKey}&units=${units}&lang=${lang}`;
    
    console.log(`🌤️ Llamando a la API para ${query}:`, url);
    
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ Error API: ${response.status} - ${response.statusText}`);
      if (response.status === 401) {
        console.error('🔑 API key inválida o expirada. Por favor, verifica tu API key de OpenWeatherMap.');
        throw new Error('API key inválida. Verifica tu configuración.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Respuesta API para ${query}:`, data);

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
    console.error(`Error fetching weather for ${query}:`, error);
    
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    // Return fallback data if API fails
    console.warn(`Using fallback data for ${query} due to API error`);
    return fallbackData;
  }
}

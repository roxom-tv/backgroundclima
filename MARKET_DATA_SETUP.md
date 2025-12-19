# Configuración de APIs para Datos de Mercado en Tiempo Real

Para que las placas de mercado (Gold, Silver, Oil, FX) muestren datos reales actualizados, necesitas configurar las siguientes APIs:

## 📋 APIs Requeridas

### 1. **Metals API** (Oro y Plata)
- **Servicio**: [metals.dev](https://metals.dev/)
- **Datos**: Precios de oro (XAU) y plata (XAG) en tiempo real
- **Plan Gratuito**: 50 requests/día
- **Cómo obtener la API Key**:
  1. Visita https://metals.dev/
  2. Crea una cuenta gratuita
  3. Obtén tu API key desde el dashboard
  4. Agrega a `.env.local`:
     ```
     METALS_API_URL=https://api.metals.dev
     METALS_API_KEY=tu_api_key_aqui
     ```

### 2. **Oil API** (Petróleo WTI y Brent)
- **Servicio**: [oilpriceapi.com](https://oilpriceapi.com/)
- **Datos**: Precios de petróleo WTI y Brent en tiempo real
- **Plan Gratuito**: 100 requests/día
- **Cómo obtener la API Key**:
  1. Visita https://oilpriceapi.com/
  2. Crea una cuenta gratuita
  3. Obtén tu API key desde el dashboard
  4. Agrega a `.env.local`:
     ```
     OIL_API_URL=https://api.oilpriceapi.com/v1/prices/latest
     OIL_API_KEY=tu_api_key_aqui
     ```

### 3. **FX API** (Divisas - EUR, JPY, GBP, ARS)
- **Servicio**: [exchangerate.host](https://exchangerate.host/) (Gratis, sin API key)
- **Datos**: Tasas de cambio de divisas en tiempo real
- **Plan Gratuito**: Ilimitado (con rate limiting)
- **Configuración**:
  ```
  FX_API_URL=https://api.exchangerate.host/latest
  ```
  No requiere API key para el plan gratuito.

## 🔧 Pasos para Configurar

1. **Crea un archivo `.env.local`** en la raíz del proyecto (si no existe)

2. **Copia el contenido de `env.example`** y reemplaza los valores con tus API keys:
   ```bash
   cp env.example .env.local
   ```

3. **Obtén las API keys** de los servicios mencionados arriba

4. **Agrega las variables al archivo `.env.local`**:
   ```env
   # Metals API
   METALS_API_URL=https://api.metals.dev
   METALS_API_KEY=tu_metals_api_key

   # Oil API
   OIL_API_URL=https://api.oilpriceapi.com/v1/prices/latest
   OIL_API_KEY=tu_oil_api_key

   # FX API (gratis, no requiere key)
   FX_API_URL=https://api.exchangerate.host/latest
   ```

5. **Reinicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

## ⚠️ Notas Importantes

- **Límites de Rate Limiting**: 
  - Metals.dev: 50 requests/día (plan gratuito)
  - OilPriceAPI: 100 requests/día (plan gratuito)
  - El código cachea los datos por 60 segundos para optimizar el uso de requests

- **Sin API Keys**: Si no configuras las APIs, las placas mostrarán "DATA UNAVAILABLE" en lugar de datos dummy

- **Errores**: Si alguna API falla, solo esa sección mostrará "DATA UNAVAILABLE", las demás seguirán funcionando

## 🧪 Verificar Configuración

Después de configurar, puedes verificar que las APIs funcionan:
1. Abre la consola del navegador (F12)
2. Busca mensajes como "Metals API Config: ✓ Set" en los logs del servidor
3. Las placas deberían mostrar datos reales en lugar de "DATA UNAVAILABLE"

## 📊 Alternativas de APIs

Si prefieres usar otras APIs, puedes modificar el código en `app/api/markets/sats/route.ts`:
- **Metals**: También puedes usar APIs como APMEX, Kitco, etc.
- **Oil**: Alternativas como Alpha Vantage, EIA, etc.
- **FX**: Alternativas como Fixer.io, CurrencyLayer, exchangerate-api.com, etc.






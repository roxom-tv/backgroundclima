# 📊 Reporte de Consumo de APIs por Hora

## Configuración Actual

### 1. **Markets API** (Gold, Silver, Oil, FX)
- **Cache**: 1 hora
- **Intervalo cliente**: 1 hora
- **Llamadas por hora**: `1 llamada/hora`

#### APIs externas dentro de Markets:
- **Metals.dev** (Gold + Silver): `0.125 llamadas/hora` (cache de 8 horas - límite 100/mes)
- **OilPriceAPI.com** (WTI + Brent): `1 llamada/hora` (cache de 1 hora - Plan Exploration 10,000/mes)
- **ExchangeRate.host** (EUR, JPY, GBP): `1 llamada/hora` (cache de 1 hora)
- **BTC (Roxom)**: Usa cache compartido (ver BTC Price API)

**Total Markets por hora**: ~2.125 llamadas/hora (3 APIs externas con caches diferentes)

---

### 2. **Debt API** (U.S. Treasury)
- **Cache servidor**: 15 minutos
- **Intervalo cliente**: 15 minutos
- **Llamadas por hora**: `60 minutos / 15 minutos = 4 llamadas/hora`

#### APIs externas dentro de Debt:
- **Treasury API** (debt_to_penny): `4 llamadas/hora`
- **MTS Table 1** (Spending/Deficit): `~0.042 llamadas/hora` (cache 24h, casi nunca)
- **BTC (Roxom)**: Usa cache compartido

**Total Debt por hora**: ~4 llamadas/hora

---

### 3. **BTC Price API** (Roxom)
- **Cache servidor**: 2 minutos
- **Intervalo cliente**: 2 minutos
- **Llamadas por hora**: `60 minutos / 2 minutos = 30 llamadas/hora`

**Nota**: Usa cache compartido (`lib/btc-cache.ts`), así que múltiples componentes que lo llamen solo consumen 1 request cada 2 minutos.

**Total BTC por hora**: `30 llamadas/hora` (máximo, si hay múltiples clientes)

---

### 4. **Weather API** (OpenWeatherMap)
- **Cache**: 2 horas
- **Ciudades**: 10 ciudades
- **Prefetch**: Una vez al inicio (10 llamadas)
- **Renovación**: Cada 2 horas por ciudad

**Cálculo**:
- Prefetch inicial: 10 llamadas (una vez)
- Renovación: `10 ciudades / 2 horas = 5 llamadas/hora`

**Total Weather por hora**: `5 llamadas/hora` (después del prefetch inicial)

---

### 5. **Federal Spending/Deficit** (MTS Table 1)
- **Cache**: 24 horas
- **Llamadas por hora**: `1 llamada / 24 horas = 0.042 llamadas/hora`

**Total MTS por hora**: `~0.042 llamadas/hora` (prácticamente despreciable)

---

## 📈 Resumen Total por API Externa

| API Externa | Llamadas/Hora | Llamadas/Día | Llamadas/Mes |
|------------|---------------|--------------|--------------|
| **OpenWeatherMap** | 5 | 120 | ~3,600 |
| **U.S. Treasury** (debt_to_penny) | 4 | 96 | ~2,880 |
| **Roxom BTC** | 30 | 720 | ~21,600 |
| **Metals.dev** | 0.125 | 3 | ~90 |
| **OilPriceAPI.com** | 1 | 24 | ~720 |
| **ExchangeRate.host** | 1 | 24 | ~720 |
| **MTS Table 1** | 0.042 | ~1 | ~30 |

---

## 🎯 Límites de APIs y Estado

### ✅ Dentro de Límites:
- **OilPriceAPI.com**: 720/mes (límite: 10,000/mes - Plan Exploration) ✅ (7.2% del límite)
- **Metals.dev**: 90/mes (límite: 100/mes) ✅ (90% del límite - cache de 8 horas)
- **OpenWeatherMap**: 3,600/mes (límite: 1,000,000/mes free tier) ✅
- **ExchangeRate.host**: 720/mes (límite: 1,500/mes free tier) ✅

### ⚠️ Sin Límite Conocido (pero optimizado):
- **U.S. Treasury**: API pública, sin límite conocido
- **Roxom BTC**: API propia, sin límite conocido

---

## 💡 Optimizaciones Aplicadas

1. **Markets API**: 
   - Oil/FX: Cache de 1 hora → 24 llamadas/día (optimizado para plan Exploration de OilPriceAPI)
   - Metals: Cache de 8 horas → 3 llamadas/día (optimizado para límite gratuito de 100/mes)
2. **Debt API**: Cache de 15 minutos → reduce de 1,440 llamadas/día a 96 llamadas/día
3. **Weather API**: Cache de 2 horas → reduce de 120 llamadas/día a 60 llamadas/día
4. **Oil API**: Request combinado (WTI + Brent) → reduce 50% de llamadas
5. **BTC Cache**: Cache compartido → evita llamadas duplicadas

---

## 📝 Notas Importantes

- **BTC Price**: Aunque el cliente llama cada 2 minutos, el servidor cachea 2 minutos, así que múltiples clientes comparten el mismo cache.
- **Weather**: El prefetch inicial hace 10 llamadas al inicio, luego solo renueva cada 2 horas.
- **Markets**: Todas las APIs de mercado se agrupan en una sola llamada cada 12 horas.

---

**Última actualización**: 
- OilPriceAPI: Cache de 1 hora (plan Exploration - 10,000/mes)
- Metals.dev: Cache separado de 8 horas para cumplir límite gratuito de 100/mes
- FX: Cache de 1 hora




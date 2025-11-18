# Frecuencia de Actualización de Datos de Mercado

## Configuración Actual

- **Placas de mercado**: 10 placas
- **Símbolos por placa**: 5 símbolos
- **Total símbolos únicos**: 50 símbolos
- **Cache**: 15 minutos (900 segundos)
- **Duración por placa**: 15 segundos
- **Duración por ciudad**: 35 segundos (ROTATION_SECONDS)
- **Items totales**: 20 (10 ciudades + 10 placas)

## Cálculo del Ciclo Completo

- **Ciclo completo**: 20 items × (35s ciudad + 15s placa promedio) = ~1000 segundos = **~16.7 minutos**
- **Cada placa aparece**: Cada ~16.7 minutos en el ciclo

## Frecuencia de Actualización

### Por Símbolo Individual

- **Cache de 15 minutos**: Cada símbolo se actualiza **máximo 1 vez cada 15 minutos**
- **Actualizaciones por hora**: 60 min ÷ 15 min = **4 veces por hora**
- **Actualizaciones por día**: 4 × 24 = **96 veces por día**

### Por Placa Completa

- **Cada placa aparece**: Cada ~16.7 minutos
- **Con cache de 15 min**: La placa se actualiza cuando aparece Y el cache ha expirado
- **En la práctica**: Como el cache es de 15 min y la placa aparece cada ~16.7 min, **casi siempre se actualiza** cuando aparece

## Requests a la API

### Por Símbolo
- **Requests por símbolo por día**: 96 requests
- **Requests por símbolo por hora**: 4 requests

### Total del Sistema
- **Total requests por día**: 50 símbolos × 96 = **4,800 requests/día** (teórico)
- **Con rate limiter**: Máximo **800 requests/día** (límite estricto)
- **Con cache**: El uso real será mucho menor porque:
  - El cache previene requests innecesarias
  - Si un símbolo ya está en cache, no se hace request
  - El rate limiter distribuye las requests a lo largo del tiempo

### Requests por Minuto
- **Máximo permitido**: 8 requests/minuto
- **Promedio teórico**: 4,800 requests/día ÷ 1,440 min/día = 3.33 requests/minuto
- **Con cache activo**: Mucho menor, típicamente 0-2 requests/minuto

## Comportamiento Real

### Escenario Normal (con cache)
1. **Primera carga**: 50 símbolos hacen request (distribuidos en el tiempo)
2. **Cache activo**: Durante 15 minutos, NO se hacen requests nuevas
3. **Después de 15 min**: Cuando una placa aparece y el cache expiró, se actualiza
4. **Rate limiter**: Si hay 7+ requests en el último minuto, espera automáticamente

### Protecciones Implementadas

1. **Cache de 15 minutos**: Previene requests innecesarias
2. **Rate limiter por minuto**: Máximo 8/min, espera automáticamente si es necesario
3. **Rate limiter diario**: Máximo 800/día, usa solo cache si se acerca al límite
4. **Procesamiento secuencial**: Los símbolos se procesan uno por uno, no en paralelo

## Resumen

- **Cada símbolo se actualiza**: Máximo 1 vez cada 15 minutos
- **Cada placa se actualiza**: Cuando aparece en el ciclo (~cada 16.7 min) Y el cache expiró
- **Requests reales**: Mucho menos que el teórico gracias al cache
- **Límites respetados**: 8/min y 800/día estrictamente controlados












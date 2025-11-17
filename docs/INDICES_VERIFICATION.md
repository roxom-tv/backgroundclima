# Verificación de Índices - Datos Reales

Este documento explica cómo verificar que todos los índices muestran datos reales de la API de Twelve Data.

## Índices de Latinoamérica

Los siguientes índices están configurados para usar datos reales de Twelve Data:

| Índice | Símbolo Interno | Símbolo Twelve Data | Estado |
|--------|----------------|---------------------|--------|
| MERVAL Argentina | `MERVAL` | `MERV` | ✅ Configurado |
| IBOVESPA Brazil | `IBOVESPA` | `BVSP` | ✅ Configurado |
| IPC Mexico | `IPC` | `MXX` | ✅ Configurado |
| IPSA Chile | `IPSA` | `IPSA` | ✅ Configurado |
| IGBC Colombia | `IGBC` | `IGBC` | ✅ Configurado |

## Otros Índices Globales

Todos los índices están configurados para usar datos reales:

- **S&P 500**: `SPX`
- **NASDAQ**: `IXIC`
- **DOW**: `DJI`
- **FTSE 100**: `FTSE`
- **Nikkei 225**: `N225`
- **Hang Seng**: `HSI`
- **Shanghai Composite**: `000001.SS`
- **ASX 200**: `AXJO`
- **SENSEX**: `BSESN`
- **KOSPI**: `KS11`
- **DAX**: `GDAXI`
- **CAC 40**: `FCHI`
- **IBEX 35**: `IBEX`
- **FTSE MIB**: `FTSEMIB`
- **AEX**: `AEX`

## Cómo Verificar

### 1. Revisar Logs del Servidor

Cuando la aplicación se ejecuta, los logs mostrarán:
- ✅ `Updated X/5 symbols with REAL API data` - Datos reales cargados
- ⚠️ `No API data found for symbol: X` - Símbolo no encontrado
- 🔴 `LATIN AMERICA INDEX MISSING/FAILED` - Índice de Latinoamérica con problema

### 2. Verificar en la Consola del Navegador

Abre la consola del navegador (F12) y busca:
- Mensajes de éxito: `✅ Updated X/Y symbols with REAL API data`
- Mensajes de advertencia: `⚠️ No API data found for symbol`
- Errores específicos de Latinoamérica: `🔴 LATIN AMERICA INDEX MISSING`

### 3. Verificar en Vercel Logs

1. Ve a tu proyecto en Vercel
2. Click en **Functions** → **market-data**
3. Revisa los logs para ver qué símbolos están funcionando

## Comportamiento Actual

- **Solo datos reales**: El código NO muestra datos mock/dummy
- **Filtrado automático**: Si un símbolo no tiene datos reales, se omite (no se muestra)
- **Logs detallados**: Los logs indican claramente qué símbolos funcionan y cuáles no

## Si un Índice No Funciona

Si un índice de Latinoamérica (o cualquier otro) no muestra datos:

1. **Verificar el símbolo en Twelve Data**:
   - Ve a https://twelvedata.com/docs
   - Busca el símbolo correcto para ese índice
   - Actualiza `config/twelveDataSymbols.ts` con el símbolo correcto

2. **Verificar en los logs**:
   - Busca el mensaje `🔴 LATIN AMERICA INDEX MISSING/FAILED`
   - Revisa qué símbolo está fallando

3. **Alternativas**:
   - Algunos índices pueden requerir suscripción premium
   - Verifica que la API key tenga acceso a esos símbolos

## Confirmación

✅ **Todos los índices están configurados para usar datos reales**
✅ **No se muestran datos mock/dummy en pantalla**
✅ **Los logs indican claramente qué símbolos funcionan**









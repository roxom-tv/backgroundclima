'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MarketPlate as MarketPlateType, MarketData } from '@/config/marketPlates';
import { TWELVE_DATA_SYMBOLS } from '@/config/twelveDataSymbols';

interface MarketPlateProps {
  plate: MarketPlateType;
}

export default function MarketPlate({ plate }: MarketPlateProps) {
  // NO inicializar con datos mock - solo usar datos reales de la API
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remainingPerMinute: number; remainingPerDay: number } | null>(null);

  useEffect(() => {
    let isMounted = true; // Flag para verificar si el componente sigue montado
    
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        // NO resetear hasInitialData aquí - mantener datos anteriores si existen
        // Solo resetear si realmente no hay datos
        
        // Mapear símbolos a Twelve Data (excluir USD que no necesita API)
        const symbols = plate.data
          .filter(item => item.symbol !== 'USD') // USD se maneja especialmente
          .map(item => {
            const twelveDataSymbol = TWELVE_DATA_SYMBOLS[item.symbol] || item.symbol;
            return twelveDataSymbol;
          });

        // Si es una placa de Forex, también necesitamos el precio de BTC
        const isForexPlate = plate.type === 'forex';
        const allSymbols = isForexPlate ? [...symbols, 'BTC/USD'] : symbols;

        console.log(`[MarketPlate] Fetching data for plate ${plate.id} (${plate.title}) with symbols:`, allSymbols);

        // Llamar a la API con timeout más largo (60 segundos)
        // El rate limiter puede causar delays, especialmente con múltiples símbolos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout
        
        try {
          const response = await fetch(`/api/market-data?symbols=${allSymbols.join(',')}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`[MarketPlate] API error: ${response.status} - ${errorText}`);
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log(`[MarketPlate] API response:`, result);
          
          // Guardar información de rate limit
          if (result.rateLimitInfo) {
            setRateLimitInfo({
              remainingPerMinute: result.rateLimitInfo.remainingPerMinute,
              remainingPerDay: result.rateLimitInfo.remainingPerDay,
            });
          }
        
        if (result.data && result.data.length > 0) {
          // Si es Forex, obtener precio de BTC
          let btcPrice = 0;
          if (isForexPlate) {
            const btcData = result.data.find((d: any) => d.symbol === 'BTC/USD');
            if (btcData) {
              btcPrice = btcData.value;
              console.log(`[MarketPlate] BTC price: $${btcPrice}`);
            } else {
              console.warn('⚠️ BTC price not found, cannot calculate Satoshis');
            }
          }

          // Mapear datos de la API a nuestro formato
          // Permitir null temporalmente para filtrar después
          const mappedData: (MarketData | null)[] = plate.data.map((item) => {
            // Manejar USD especialmente (no necesita API)
            if (item.symbol === 'USD' && isForexPlate && btcPrice > 0) {
              // 1 USD = (1 / precio_BTC_USD) * 100,000,000 Satoshis
              const SATOSHIS_PER_BTC = 100000000;
              const satoshis = (1 / btcPrice) * SATOSHIS_PER_BTC;
              
              // Para USD, el cambio en Satoshis es proporcional al cambio de BTC
              // Si BTC sube 1%, entonces 1 USD vale menos Satoshis (cambio negativo)
              // Usar el cambio inverso de BTC (aproximado)
              const btcData = result.data.find((d: any) => d.symbol === 'BTC/USD');
              const btcChange = btcData?.change || 0;
              const change = -btcChange; // Invertir porque si BTC sube, USD vale menos Satoshis
              const changeAmount = satoshis * (change / 100);
              
              console.log(`[MarketPlate] ${item.symbol}: 1 USD = ${satoshis.toFixed(2)} Satoshis`);
              
              return {
                symbol: 'USD',
                name: 'US Dollar',
                value: satoshis,
                change: change,
                changeAmount: changeAmount,
                changeType: btcData?.changeType || 'daily',
              };
            }
            
            const twelveDataSymbol = TWELVE_DATA_SYMBOLS[item.symbol] || item.symbol;
            const apiData = result.data.find((d: any) => {
              return d.symbol === twelveDataSymbol;
            });

            if (apiData) {
              let value = apiData.value;
              let change = apiData.change;
              let changeAmount = apiData.changeAmount;

              // Si es Forex, calcular Satoshis
              if (isForexPlate && btcPrice > 0) {
                // Determinar si necesitamos invertir el par
                const needsInversion = twelveDataSymbol.startsWith('USD/') && item.symbol !== 'USD';
                const priceInUSD = needsInversion ? 1 / value : value;
                
                // Calcular Satoshis: (precio_USD / precio_BTC_USD) * 100,000,000
                const SATOSHIS_PER_BTC = 100000000;
                const satoshis = (priceInUSD / btcPrice) * SATOSHIS_PER_BTC;
                
                // Calcular precio anterior en USD
                const previousPriceInUSD = needsInversion 
                  ? 1 / (apiData.value - apiData.changeAmount) 
                  : (apiData.value - apiData.changeAmount);
                
                // Calcular Satoshis anteriores (usar precio anterior de BTC si está disponible)
                // Por simplicidad, usar el precio actual de BTC (el cambio será aproximado)
                const previousSatoshis = (previousPriceInUSD / btcPrice) * SATOSHIS_PER_BTC;
                
                value = satoshis;
                changeAmount = satoshis - previousSatoshis;
                
                // El cambio porcentual se mantiene igual (es relativo)
                console.log(`[MarketPlate] ${item.symbol}: ${priceInUSD.toFixed(4)} USD = ${satoshis.toFixed(2)} Satoshis`);
              }

              // Solo usar datos reales de la API
              return {
                symbol: item.symbol, // Mantener el símbolo original para display
                name: apiData.name || item.name,
                value: value,
                change: change,
                changeAmount: changeAmount,
                changeType: apiData.changeType || 'daily',
              };
            }
            
            // Si no hay datos de la API para este símbolo, NO usar datos mock
            // Solo registrar el warning y retornar null para filtrarlo después
            console.warn(`⚠️ No API data found for symbol: ${item.symbol} (${twelveDataSymbol})`);
            // Log especial para índices de Latinoamérica
            if (['MERV', 'BVSP', 'MXX', 'IPSA', 'IGBC'].includes(twelveDataSymbol)) {
              console.error(`🔴 LATIN AMERICA INDEX MISSING: ${item.symbol} -> ${twelveDataSymbol} - Verificar símbolo`);
            }
            return null; // NO usar datos mock - solo datos reales
          });

          // Filtrar nulls - solo mantener datos reales de la API
          const realData = mappedData.filter((item): item is MarketData => item !== null);

          // Solo actualizar si tenemos datos reales de la API
          if (realData.length > 0 && isMounted) {
            console.log(`✅ Setting market data: ${realData.length} items`);
            console.log(`✅ Data preview:`, realData.map(d => `${d.symbol}: ${d.value}`));
            setMarketData(realData);
            setHasInitialData(true);
            setIsLoading(false); // Asegurar que isLoading se ponga en false
            console.log(`✅ Updated ${realData.length}/${plate.data.length} symbols with REAL API data`);
            console.log(`✅ State after update - hasInitialData: true, marketData.length: ${realData.length}`);
            console.log(`✅ Component should now render data`);
            
            // Log especial para placa de Latinoamérica
            if (plate.title === 'LATIN AMERICA INDICES') {
              console.log(`🌎 LATIN AMERICA: ${realData.length}/5 indices loaded with REAL data`);
              realData.forEach(item => {
                console.log(`  ✅ ${item.symbol}: ${item.value} (${item.change > 0 ? '+' : ''}${item.change}%)`);
              });
            }
          } else {
            console.warn('⚠️ No real API data received for any symbol');
            // Log especial para placa de Latinoamérica
            if (plate.title === 'LATIN AMERICA INDICES') {
              console.error('🔴 LATIN AMERICA INDICES: No data received - Verificar símbolos en Twelve Data');
            }
            // Si no hay datos pero ya teníamos datos antes, mantenerlos
            if (hasInitialData && marketData.length > 0) {
              // Mantener los datos que ya teníamos
              setHasInitialData(true);
            } else {
              // No hay datos y nunca tuvimos datos, mostrar loading
              setHasInitialData(false);
            }
          }
        } else {
          console.warn('API returned empty data array');
          
          // Verificar si es por rate limiting
          if (result.rateLimitInfo) {
            const { remainingPerMinute, remainingPerDay, usedPerMinute, usedPerDay } = result.rateLimitInfo;
            console.warn(`⛔ Rate limit info: ${remainingPerMinute}/8 per min, ${remainingPerDay}/800 per day`);
            
            // Si estamos en rate limit (0 o muy pocos remaining), es esperado
            if (remainingPerMinute === 0 || remainingPerDay === 0) {
              console.warn('⚠️ Rate limit reached - this is expected. Will retry when limit resets.');
            }
          }
          
          // Si ya teníamos datos antes, mantenerlos
          if (hasInitialData && marketData.length > 0) {
            setHasInitialData(true);
          } else {
            setHasInitialData(false);
          }
        }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout - API took too long to respond');
          }
          throw fetchError;
        }
      } catch (error: any) {
        if (!isMounted) return; // No hacer nada si el componente se desmontó
        
        console.error('❌ Error fetching market data:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          plateId: plate.id,
          plateTitle: plate.title
        });
        
        // Si es timeout, verificar si tenemos datos anteriores
        if (error.message.includes('timeout')) {
          console.warn('⚠️ Request timeout - pero verificando si hay datos anteriores');
        }
        
        // En caso de error, mantener los últimos datos válidos si existen
        // NO usar datos mock - solo mantener datos reales previamente cargados
        console.warn('⚠️ Keeping last known REAL data due to API error (no mock data will be shown)');
        
        // Usar una función de actualización de estado para acceder al estado actual
        setMarketData(currentData => {
          if (currentData.length > 0 && isMounted) {
            // Ya tenemos datos reales, mantenerlos
            setHasInitialData(true);
            setIsLoading(false);
            console.log(`[MarketPlate] ✅ Keeping ${currentData.length} existing data items after error`);
            return currentData;
          } else {
            // No tenemos datos reales, mostrar mensaje de error
            setHasInitialData(false);
            setIsLoading(false);
            console.warn(`[MarketPlate] ❌ No data available - will show error message`);
            return [];
          }
        });
      } finally {
        if (isMounted) {
          // Asegurar que isLoading siempre se ponga en false
          setIsLoading(false);
          // Usar función de actualización para obtener el estado actual
          setMarketData(currentData => {
            console.log(`[MarketPlate] Loading complete. hasInitialData: ${hasInitialData}, marketData.length: ${currentData.length}`);
            return currentData;
          });
        }
      }
    };

    // Actualizar solo cuando la placa se muestra por primera vez
    // No actualizar mientras está visible (cada placa solo está 15 segundos)
    fetchMarketData();
    
    // Cleanup: marcar como desmontado cuando el componente se desmonte o cambie la placa
    return () => {
      isMounted = false;
    };

    // NO actualizar automáticamente mientras está visible
    // El cache del servidor (10 minutos) y la rotación de placas (15s cada una)
    // aseguran que los datos se actualicen cuando la placa vuelve a aparecer
    // Esto mantiene las requests dentro del límite de 8/min de la API gratuita
    // 
    // Frecuencia de actualización:
    // - Cada placa se actualiza cuando aparece (cada ~5 minutos en el ciclo)
    // - Cache de 10 minutos previene actualizaciones innecesarias
    // - Promedio: ~5 requests/minuto (dentro del límite de 8/min)

    return () => {
      // No hay interval que limpiar
    };
  }, [plate.id, plate.data]); // Re-fetch solo cuando cambia la placa
  const formatValue = (value: number, type: string): string => {
    if (type === 'forex') {
      // Para Satoshis, mostrar sin decimales si es >= 1, o con 2 decimales si es < 1
      if (value >= 1) {
        return Math.round(value).toLocaleString('en-US');
      } else {
        return value.toFixed(2);
      }
    }
    if (value >= 1000) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return value.toFixed(2);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    // Verde = subió (positivo)
    if (change > 0) return 'text-green-500';
    // Rojo = bajó (negativo)
    if (change < 0) return 'text-red-500';
    // Blanco = neutro (sin cambio)
    return 'text-white';
  };

  const hasChange = (change: number): boolean => {
    return change !== 0;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -50,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.6,
      },
    },
    exit: {
      opacity: 0,
      x: 50,
      transition: {
        duration: 0.3,
      },
    },
  };

  const titleVariants = {
    hidden: { 
      opacity: 0, 
      y: -20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 20,
        duration: 0.7,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.3,
      },
    },
  };

  // Debug: Log del estado actual
  console.log(`[MarketPlate Render] Plate ${plate.id} - isLoading: ${isLoading}, hasInitialData: ${hasInitialData}, marketData.length: ${marketData.length}`);

  return (
    <div className="market-plate-container">
      {/* Mostrar switching feed mientras carga y no hay datos iniciales */}
      {/* Solo mostrar si el switching feed de RotatingBackground no está activo */}
      {isLoading && marketData.length === 0 && (
        <div className="channel-change-overlay" style={{ zIndex: 10002 }}>
          <div className="tv-static"></div>
          <div className="interference-lines"></div>
          <div className="channel-change-text">LOADING MARKET DATA...</div>
        </div>
      )}
      
      {/* Mostrar mensaje de error si no hay datos después de cargar */}
      {!isLoading && marketData.length === 0 && (
        <div className="market-plate-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div className="market-plate-title" style={{ color: '#ff6b6b' }}>
            UNABLE TO LOAD MARKET DATA
          </div>
          {rateLimitInfo && (rateLimitInfo.remainingPerMinute === 0 || rateLimitInfo.remainingPerDay === 0) ? (
            <div style={{ color: '#ffa500', fontSize: '20px', textAlign: 'center' }}>
              Rate limit reached. Waiting for reset...
              <br />
              <span style={{ fontSize: '16px', color: '#b0b0b0' }}>
                {rateLimitInfo.remainingPerMinute === 0 ? 'Per minute limit' : 'Daily limit'}
              </span>
            </div>
          ) : (
            <div style={{ color: '#b0b0b0', fontSize: '24px', textAlign: 'center' }}>
              Please check the console for error details
            </div>
          )}
        </div>
      )}
      
      {/* Mostrar contenido cuando hay datos - condición simplificada */}
      {marketData.length > 0 && (
        <motion.div
          key={`content-${plate.id}-${marketData.length}`}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className="market-plate-content"
          style={{ 
            opacity: 1,
            position: 'relative',
            zIndex: 3,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Título */}
          <motion.div 
            variants={titleVariants}
            className="market-plate-title"
          >
            {plate.title}
          </motion.div>

          {/* Lista de datos en filas horizontales */}
          <div className="market-data-list">
          {marketData.map((item, index) => (
            <motion.div
              key={item.symbol}
              variants={itemVariants}
              className="market-data-row"
            >
              {/* Símbolo - texto sin badge */}
              <div className="market-symbol-text">
                {item.symbol}
              </div>

              {/* Contenido principal */}
              <div className="market-row-content">
                {/* Nombre del activo - Para Forex mostrar "1 [MONEDA] = X Satoshis" */}
                <div className="market-row-name">
                  {plate.type === 'forex' ? (
                    <>1 {item.symbol} = {formatValue(item.value, plate.type)} Satoshis</>
                  ) : (
                    item.name
                  )}
                </div>

                {/* Valor principal - Solo mostrar si no es Forex (ya está en el nombre) */}
                {plate.type !== 'forex' && (
                  <div className="market-row-value">
                    {formatValue(item.value, plate.type)}
                  </div>
                )}
              </div>

              {/* Cambios con flecha - Layout horizontal */}
              <div className={`market-row-change ${getChangeColor(item.change)}`}>
                {/* Flecha - solo mostrar si hay cambio */}
                {hasChange(item.change) && (
                  <div className="change-arrow">
                    {item.change > 0 ? (
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 4L12 8H9V12H7V8H4L8 4Z"/>
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 12L4 8H7V4H9V8H12L8 12Z"/>
                      </svg>
                    )}
                  </div>
                )}
                
                {/* Cambio absoluto */}
                <span className="change-absolute">
                  {hasChange(item.changeAmount) && item.changeAmount > 0 ? '+' : ''}
                  {hasChange(item.changeAmount) ? formatValue(item.changeAmount, plate.type) : '0.00'}
                </span>
                
                {/* Cambio porcentual */}
                <span className="change-percent">
                  {formatChange(item.change)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      )}
    </div>
  );
}


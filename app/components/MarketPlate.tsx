'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MarketPlate as MarketPlateType, MarketData } from '@/config/marketPlates';
import { TWELVE_DATA_SYMBOLS } from '@/config/twelveDataSymbols';

interface MarketPlateProps {
  plate: MarketPlateType;
}

export default function MarketPlate({ plate }: MarketPlateProps) {
  const [marketData, setMarketData] = useState<MarketData[]>(plate.data);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialData, setHasInitialData] = useState(false);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        
        // Mapear símbolos a Twelve Data
        const symbols = plate.data.map(item => {
          const twelveDataSymbol = TWELVE_DATA_SYMBOLS[item.symbol] || item.symbol;
          return twelveDataSymbol;
        });

        // Llamar a la API
        const response = await fetch(`/api/market-data?symbols=${symbols.join(',')}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch market data');
        }

        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          // Mapear datos de la API a nuestro formato
          const mappedData: MarketData[] = plate.data.map((item) => {
            const twelveDataSymbol = TWELVE_DATA_SYMBOLS[item.symbol] || item.symbol;
            const apiData = result.data.find((d: any) => {
              return d.symbol === twelveDataSymbol;
            });

            if (apiData) {
              // Solo usar datos reales de la API
              return {
                symbol: item.symbol, // Mantener el símbolo original para display
                name: apiData.name || item.name,
                value: apiData.value,
                change: apiData.change,
                changeAmount: apiData.changeAmount,
                changeType: apiData.changeType || 'daily',
              };
            }
            
            // Si no hay datos de la API para este símbolo, mantener el último valor conocido
            // o usar el mock solo como último recurso (pero esto no debería pasar)
            console.warn(`No API data found for symbol: ${item.symbol} (${twelveDataSymbol})`);
            return item; // Esto solo debería pasar si la API no devuelve el símbolo
          });

          // Verificar que tenemos datos reales de la API (no solo mocks)
          // Contar cuántos símbolos tienen datos reales de la API
          const realDataCount = mappedData.filter((item, index) => {
            const twelveDataSymbol = TWELVE_DATA_SYMBOLS[plate.data[index].symbol] || plate.data[index].symbol;
            return result.data.some((d: any) => d.symbol === twelveDataSymbol);
          }).length;

          // Solo actualizar si tenemos al menos algunos datos reales de la API
          // (no solo datos mock)
          if (realDataCount > 0) {
            setMarketData(mappedData);
            setHasInitialData(true);
            console.log(`Updated ${realDataCount}/${plate.data.length} symbols with real API data`);
          } else {
            console.warn('No real API data received, keeping last known data');
            // Si ya teníamos datos antes, mantenerlos
            if (hasInitialData) {
              setHasInitialData(true);
            }
          }
        } else {
          console.warn('API returned empty data array');
          // Si ya teníamos datos antes, mantenerlos
          if (hasInitialData) {
            setHasInitialData(true);
          }
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        // En caso de error, NO actualizar los datos (mantener los últimos datos válidos)
        // Esto evita mostrar datos mock obsoletos
        console.warn('Keeping last known data due to API error');
        // Si ya teníamos datos antes, mantenerlos
        if (hasInitialData) {
          setHasInitialData(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Actualizar solo cuando la placa se muestra por primera vez
    // No actualizar mientras está visible (cada placa solo está 15 segundos)
    fetchMarketData();

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
      return value.toFixed(4);
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

  return (
    <div className="market-plate-container">
      {/* Mostrar switching feed mientras carga y no hay datos iniciales */}
      {/* Solo mostrar si el switching feed de RotatingBackground no está activo */}
      {isLoading && !hasInitialData && (
        <div className="channel-change-overlay" style={{ zIndex: 10002 }}>
          <div className="tv-static"></div>
          <div className="interference-lines"></div>
          <div className="channel-change-text">LOADING MARKET DATA...</div>
        </div>
      )}
      
      {/* Mostrar contenido solo cuando hay datos o cuando ya cargó antes */}
      {(hasInitialData || !isLoading) && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className="market-plate-content"
          style={{ opacity: isLoading && !hasInitialData ? 0 : 1 }}
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
                {/* Nombre del activo */}
                <div className="market-row-name">
                  {item.name}
                </div>

                {/* Valor principal */}
                <div className="market-row-value">
                  {formatValue(item.value, plate.type)}
                </div>
              </div>

              {/* Cambios con flecha */}
              <div className={`market-row-change ${getChangeColor(item.change)}`}>
                {/* Contenedor de flecha y cambio absoluto */}
                <div className="flex items-center gap-3">
                  {/* Flecha - solo mostrar si hay cambio */}
                  {hasChange(item.change) && (
                    <div className="change-arrow">
                      {item.change > 0 ? (
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 4L12 8H9V12H7V8H4L8 4Z"/>
                        </svg>
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
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
                </div>
                
                {/* Cambio porcentual con tipo */}
                <div className="flex flex-col items-end">
                  <span className="change-percent">
                    {formatChange(item.change)}
                  </span>
                  {item.changeType && (
                    <span className="change-type-label">
                      {item.changeType === 'intraday' ? 'INTRADAY' : 
                       item.changeType === '24h' ? '24H' : 
                       'DAILY'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      )}
    </div>
  );
}


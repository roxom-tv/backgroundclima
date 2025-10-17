'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateFinancialPlatesData, FINANCIAL_PLATES } from '@/lib/alphavantage';

interface MarketDataDisplayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function MarketDataDisplay({ isVisible, onComplete }: MarketDataDisplayProps) {
  const [financialPlates, setFinancialPlates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlateIndex, setCurrentPlateIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setLoading(true);
      
      // Generate financial plates data
      const fetchData = async () => {
        console.log('MarketDataDisplay: Generating financial plates data');
        const platesData = generateFinancialPlatesData();
        console.log('MarketDataDisplay: Financial plates generated:', platesData.length, 'plates');
        setFinancialPlates(platesData);
        setLoading(false);
        setCurrentPlateIndex(0);
      };

      fetchData();
    }
  }, [isVisible]);

  // Rotar entre placas cada 5 segundos
  useEffect(() => {
    if (!isVisible || loading || financialPlates.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPlateIndex((prev) => (prev + 1) % financialPlates.length);
    }, 5000); // Cambiar placa cada 5 segundos

    return () => clearInterval(interval);
  }, [isVisible, loading, financialPlates.length]);

  // Auto-completar después de 15 segundos
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onComplete();
    }, 15000);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  const renderFinancialPlate = (plate: any) => {
    const { title, type, data } = plate;
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Chyron-style header bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '3px solid #60a5fa',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            letterSpacing: '2px'
          }}>
            {title}
          </div>
        </div>

        {/* Main content area */}
        <div style={{
          marginTop: '100px',
          width: '100%',
          maxWidth: '1200px',
          padding: '0 40px'
        }}>

          {/* Chyron-style content grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
            width: '100%',
            height: 'calc(100vh - 120px)',
            overflow: 'hidden'
          }}>
            {type === 'bonds' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #60a5fa',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    US 10Y TREASURY
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.ust10y}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #f87171',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    GERMAN BUND 10Y
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.bund10y}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #34d399',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    JAPAN JGB 10Y
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.jgb10y}%
                  </div>
                </div>
              </>
            )}

            {type === 'commodities' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #fb923c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    WTI CRUDE OIL
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    marginBottom: '6px'
                  }}>
                    ${data.wti_price}
                  </div>
                  <div style={{
                    color: parseFloat(data.wti_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.wti_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.wti_pct) >= 0 ? '+' : ''}{data.wti_pct}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #fbbf24',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    GOLD
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    ${data.gold_price}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    COPPER
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    ${data.copper_price}
                  </div>
                </div>
              </>
            )}

            {type === 'fx' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #60a5fa',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    EUR/USD
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.eurusd}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #fb923c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    USD/JPY
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.usdjpy}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #34d399',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    DOLLAR INDEX
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.dxy}
                  </div>
                </div>
              </>
            )}

            {type === 'inflation' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #f87171',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    US CPI YOY
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.us_cpi_yoy}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #fb923c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    EUROZONE CPI YOY
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.eu_cpi_yoy}%
                  </div>
                </div>
              </>
            )}

            {type === 'etf' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #fbbf24',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    GOLD ETF FLOWS
                  </div>
                  <div style={{
                    color: parseFloat(data.gold_etf_flow) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.gold_etf_flow) >= 0 ? '+' : ''}{data.gold_etf_flow}M
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #60a5fa',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    S&P 500 ETF FLOWS
                  </div>
                  <div style={{
                    color: parseFloat(data.spx_etf_flow) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.spx_etf_flow) >= 0 ? '+' : ''}{data.spx_etf_flow}M
                  </div>
                </div>
              </>
            )}

            {type === 'equities' && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #60a5fa',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    S&P 500
                  </div>
                  <div style={{
                    color: parseFloat(data.spx_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.spx_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.spx_pct) >= 0 ? '+' : ''}{data.spx_pct}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #fb923c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    NASDAQ
                  </div>
                  <div style={{
                    color: parseFloat(data.ndx_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.ndx_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.ndx_pct) >= 0 ? '+' : ''}{data.ndx_pct}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #34d399',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    MSCI WORLD
                  </div>
                  <div style={{
                    color: parseFloat(data.msci_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.msci_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.msci_pct) >= 0 ? '+' : ''}{data.msci_pct}%
                  </div>
                </div>
              </>
            )}

            {type === 'risk' && (
              <>
                <div style={{
                  background: parseFloat(data.vix_level) > 20 ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 
                             parseFloat(data.vix_level) > 15 ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' : 
                             'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: parseFloat(data.vix_level) > 20 ? '2px solid #f87171' : 
                         parseFloat(data.vix_level) > 15 ? '2px solid #fbbf24' : 
                         '2px solid #34d399',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    VIX VOLATILITY
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {data.vix_level}
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #60a5fa',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    DOLLAR INDEX
                  </div>
                  <div style={{
                    color: parseFloat(data.dxy_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.dxy_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.dxy_pct) >= 0 ? '+' : ''}{data.dxy_pct}%
                  </div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #fb923c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    OIL
                  </div>
                  <div style={{
                    color: parseFloat(data.wti_pct) >= 0 ? '#10b981' : '#ef4444',
                    fontSize: '42px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
                  }}>
                    {parseFloat(data.wti_pct) >= 0 ? '↗' : '↘'} {parseFloat(data.wti_pct) >= 0 ? '+' : ''}{data.wti_pct}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) {
    console.log('MarketDataDisplay: Not visible, returning null');
    return null;
  }

  console.log('MarketDataDisplay: Rendering with', financialPlates.length, 'plates, loading:', loading);


  return (
    <div 
      className="market-data-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="market-data-container"
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #333',
          position: 'relative'
        }}
      >

        {/* Content */}
        {loading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid #666',
              borderTop: '4px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{
              color: 'white',
              fontFamily: 'var(--font-pixel)',
              fontSize: '24px',
              letterSpacing: '2px'
            }}>
              Loading market data...
            </span>
          </div>
               ) : financialPlates.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid #666',
              borderTop: '4px solid #ff0000',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{
              color: 'white',
              fontFamily: 'var(--font-pixel)',
              fontSize: '24px',
              letterSpacing: '2px'
            }}>
              No market data available...
            </span>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '20px' }}>
            {financialPlates.length > 0 && (
              <motion.div
                key={currentPlateIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {renderFinancialPlate(financialPlates[currentPlateIndex])}
              </motion.div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

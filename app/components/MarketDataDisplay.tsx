'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMultipleMarketData, MARKET_SYMBOLS, type MarketData } from '@/lib/alphavantage';

interface MarketDataDisplayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function MarketDataDisplay({ isVisible, onComplete }: MarketDataDisplayProps) {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setLoading(true);
      
      // Fetch real market data from Alpha Vantage
      const fetchData = async () => {
        try {
          const symbols = MARKET_SYMBOLS.map(s => s.symbol);
          const data = await fetchMultipleMarketData(symbols);
          setMarketData(data);
        } catch (error) {
          console.error('Error fetching market data:', error);
          // Fallback to empty array - the API will handle fallback data
          setMarketData([]);
        } finally {
          setLoading(false);
          setCurrentIndex(0);
        }
      };

      fetchData();
    }
  }, [isVisible]);

  // Rotar entre diferentes vistas de datos de mercado
  useEffect(() => {
    if (!isVisible || loading) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 3); // 3 vistas diferentes
    }, 2000); // Cambiar vista cada 2 segundos

    return () => clearInterval(interval);
  }, [isVisible, loading]);

  // Auto-completar después de 8 segundos
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onComplete();
    }, 8000);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatChangePercent = (changePercent: number) => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A';
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1000000000000) {
      return `$${(marketCap / 1000000000000).toFixed(1)}T`;
    } else if (marketCap >= 1000000000) {
      return `$${(marketCap / 1000000000).toFixed(1)}B`;
    } else if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(1)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  };

  if (!isVisible) return null;

  return (
    <div className="market-data-overlay">
      <div className="market-data-container">
        {/* Header */}
        <div className="market-header">
          <div className="market-title">
            <span className="market-title-text">MARKET DATA</span>
            <div className="market-title-line"></div>
          </div>
          <div className="market-time">
            {new Date().toLocaleTimeString('en-US', {
              hour12: false,
              timeZone: 'America/New_York'
            })} ET
          </div>
        </div>

        {loading ? (
          <div className="market-loading">
            <div className="loading-spinner"></div>
            <span>Loading market data...</span>
          </div>
        ) : (
          <div className="market-content">
            {currentIndex === 0 && (
              <motion.div
                key="indices"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="market-section"
              >
                <div className="section-title">MAJOR INDICES</div>
                <div className="market-grid">
                  {marketData.slice(0, 3).map((item, index) => (
                    <div key={item.symbol} className="market-item">
                      <div className="market-item-header">
                        <span className="market-symbol">{item.symbol}</span>
                        <span className="market-name">{item.name}</span>
                      </div>
                      <div className="market-item-values">
                        <span className="market-price">${formatPrice(item.price)}</span>
                        <div className={`market-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                          <span className="change-value">{formatChange(item.change)}</span>
                          <span className="change-percent">({formatChangePercent(item.changePercent)})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentIndex === 1 && (
              <motion.div
                key="tech"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="market-section"
              >
                <div className="section-title">TECH STOCKS</div>
                <div className="market-grid">
                  {marketData.slice(3, 6).map((item, index) => (
                    <div key={item.symbol} className="market-item">
                      <div className="market-item-header">
                        <span className="market-symbol">{item.symbol}</span>
                        <span className="market-name">{item.name}</span>
                      </div>
                      <div className="market-item-values">
                        <span className="market-price">${formatPrice(item.price)}</span>
                        <div className={`market-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                          <span className="change-value">{formatChange(item.change)}</span>
                          <span className="change-percent">({formatChangePercent(item.changePercent)})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentIndex === 2 && (
              <motion.div
                key="detailed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="market-section"
              >
                <div className="section-title">MARKET OVERVIEW</div>
                <div className="market-detailed-grid">
                  {marketData.slice(0, 4).map((item, index) => (
                    <div key={item.symbol} className="market-detailed-item">
                      <div className="market-item-header">
                        <span className="market-symbol">{item.symbol}</span>
                        <span className="market-name">{item.name}</span>
                      </div>
                      <div className="market-item-values">
                        <span className="market-price">${formatPrice(item.price)}</span>
                        <div className={`market-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                          <span className="change-value">{formatChange(item.change)}</span>
                          <span className="change-percent">({formatChangePercent(item.changePercent)})</span>
                        </div>
                      </div>
                      <div className="market-item-details">
                        <div className="detail-row">
                          <span className="detail-label">Volume:</span>
                          <span className="detail-value">{formatVolume(item.volume)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Open:</span>
                          <span className="detail-value">${formatPrice(item.open || 0)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">High:</span>
                          <span className="detail-value">${formatPrice(item.high || 0)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Low:</span>
                          <span className="detail-value">${formatPrice(item.low || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="market-footer">
          <div className="market-disclaimer">
            Data provided for informational purposes only. Not financial advice.
          </div>
          <div className="market-source">
            Source: Alpha Vantage API
          </div>
        </div>
      </div>
    </div>
  );
}

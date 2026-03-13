"use client";

import { motion } from "framer-motion";
import { useMarketsSats } from "@/hooks/useMarketsSats";
import { formatSats, formatChange24h } from "@/lib/fmt";

export default function SilverSlide() {
  const { data, loading } = useMarketsSats();

  const headerFont = { 
    fontSize: 'clamp(39px, 4vw, 59px)', 
    lineHeight: '1', 
    fontWeight: 900,
    textShadow: '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black, 0 -1px 0 black, 0 1px 0 black, -1px 0 0 black, 1px 0 0 black'
  };
  const valueFont = { fontSize: 'clamp(36px, 4vw, 64px)', lineHeight: '1', fontWeight: 900 };
  const changeFont = { fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1', fontWeight: 900 };

  const silver = data?.metals.silver;
  const hasData = silver && silver.usd > 0;

  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center p-8 relative" 
      style={{
        background: 'linear-gradient(to bottom, rgba(255, 193, 7, 0.15) 0%, rgba(0, 0, 0, 1) 100%)'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      
      {/* Panel central semi-transparente */}
      <div className="relative w-full max-w-5xl bg-[#1A1A1A]/90 shadow-2xl overflow-hidden">
        {/* Banner amarillo */}
        <div className="bg-[#F59E0B] px-6 py-5">
          <h2 className="text-white text-center tracking-wider uppercase" style={headerFont}>
            SILVER (XAG) - SATS PER TROY OUNCE
          </h2>
        </div>

        {/* Separador */}
        <div className="h-px bg-gray-800"></div>

        {/* Bloque de datos blanco */}
        <div className="bg-white px-8 py-10">
          {loading && !hasData && !data ? (
            <div className="text-black text-center" style={valueFont}>
              LOADING...
            </div>
          ) : hasData ? (
            <div className="flex flex-col gap-4 items-center">
              {/* Valor principal: sats y USD en la misma línea con mismo peso */}
              <div className="flex items-center gap-3 justify-center">
                <div className="text-black tabular-nums flex items-center gap-3" style={valueFont}>
                  <span>{formatSats(silver.sats).number} <i className="fak fa-regular"></i></span>
                  <span className="text-black">|</span>
                  <span className="text-black whitespace-nowrap">USD ${silver.usd.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                </div>
                {silver.change24hPct !== null && (
                  <>
                    <span className="text-black">|</span>
                    <div className="flex items-center gap-2">
                      {silver.change24hPct < 0 && (
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      {silver.change24hPct >= 0 && (
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`tabular-nums ${silver.change24hPct >= 0 ? 'text-green-600' : 'text-red-600'}`} style={changeFont}>
                        {formatChange24h(silver.change24hPct)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center" style={valueFont}>
              DATA UNAVAILABLE
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

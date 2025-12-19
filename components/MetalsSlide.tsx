"use client";

import { motion } from "framer-motion";
import { useMarketsSats } from "@/hooks/useMarketsSats";
import { formatSats, formatChange24h } from "@/lib/fmt";

export default function MetalsSlide() {
  const { data, loading } = useMarketsSats();

  // Estilos estandarizados (mismo que USDStats)
  const headerPadding = "px-4 py-4";
  const contentPadding = "px-6 py-10";
  const headerFont = { fontSize: 'clamp(24px, 2vw, 36px)', lineHeight: '1', fontWeight: 900 };
  const valueFont = { fontSize: 'clamp(32px, 3vw, 56px)', lineHeight: '1', fontWeight: 900 };
  const changeFont = { fontSize: 'clamp(20px, 2vw, 32px)', lineHeight: '1', fontWeight: 900 };
  
  // Specific colors from USDStats
  const headerBgColor = "bg-[#EF4444]/80"; // Bright red with 20% transparency
  const contentBgColor = "bg-[#1A1A1A]/80"; // Dark gray with 20% transparency

  const gold = data?.metals.gold;
  const silver = data?.metals.silver;
  const hasData = (gold && gold.usd > 0) || (silver && silver.usd > 0);

  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center p-8 relative bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Metals Symbol Background - Centered and Faded */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none brightness-150">
        <div className="relative w-full h-full flex items-center justify-center">
          <svg 
            width="200%" 
            height="200%" 
            viewBox="0 0 400 400" 
            className="object-contain"
            preserveAspectRatio="xMidYMid meet"
            style={{
              filter: 'drop-shadow(0 0 3px white)',
              transform: 'scale(2)'
            }}
          >
            {/* Gold Bar / Lingote de Oro */}
            <g transform="translate(200, 150)">
              {/* Main gold bar - trapezoid shape */}
              <path d="M -80 -40 L 80 -40 L 75 40 L -75 40 Z" fill="none" stroke="#FFD700" strokeWidth="4" opacity="0.6"/>
              {/* Top face highlight */}
              <path d="M -75 -35 L 75 -35 L 70 5 L -70 5 Z" fill="#FFD700" opacity="0.4"/>
              {/* Bottom face shadow */}
              <path d="M -70 5 L 70 5 L 65 35 L -65 35 Z" fill="#FFA500" opacity="0.3"/>
              {/* Side edges */}
              <line x1="-80" y1="-30" x2="-75" y2="30" stroke="#FFD700" strokeWidth="3" opacity="0.5"/>
              <line x1="80" y1="-30" x2="75" y2="30" stroke="#FFD700" strokeWidth="3" opacity="0.5"/>
              {/* Stamp/inscription area */}
              <rect x="-30" y="-15" width="60" height="20" rx="2" fill="none" stroke="#FFA500" strokeWidth="1.5" opacity="0.4"/>
              <text x="0" y="0" textAnchor="middle" fill="#FFA500" fontSize="12" fontWeight="bold" opacity="0.5">999.9</text>
            </g>
            
            {/* Silver Bar / Lingote de Plata */}
            <g transform="translate(200, 250)">
              {/* Main silver bar - trapezoid shape */}
              <path d="M -70 -35 L 70 -35 L 65 35 L -65 35 Z" fill="none" stroke="#C0C0C0" strokeWidth="3" opacity="0.6"/>
              {/* Top face highlight */}
              <path d="M -65 -30 L 65 -30 L 60 5 L -60 5 Z" fill="#E8E8E8" opacity="0.4"/>
              {/* Bottom face shadow */}
              <path d="M -60 5 L 60 5 L 55 30 L -55 30 Z" fill="#A8A8A8" opacity="0.3"/>
              {/* Side edges */}
              <line x1="-70" y1="-25" x2="-65" y2="25" stroke="#C0C0C0" strokeWidth="2" opacity="0.5"/>
              <line x1="70" y1="-25" x2="65" y2="25" stroke="#C0C0C0" strokeWidth="2" opacity="0.5"/>
              {/* Stamp/inscription area */}
              <rect x="-25" y="-10" width="50" height="15" rx="2" fill="none" stroke="#A8A8A8" strokeWidth="1" opacity="0.4"/>
            </g>
          </svg>
        </div>
      </div>

      {/* Content Container - z-10 to sit above symbol */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col gap-6 justify-center">
        
        {/* Gold Card */}
        <div className="flex flex-col shadow-xl">
          <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
            <h2 className="text-white text-center tracking-wider uppercase" style={headerFont}>
              GOLD (XAU) - SATS PER TROY OUNCE
            </h2>
          </div>
          <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
            {loading && !hasData && !data ? (
              <div className="text-white text-center" style={valueFont}>
                LOADING...
              </div>
            ) : gold && gold.usd > 0 ? (
              <div className="text-white tabular-nums flex items-center gap-3 whitespace-nowrap justify-center" style={valueFont}>
                <span>{formatSats(gold.sats).number} <i className="fak fa-regular"></i></span>
                <span className="text-white/60">|</span>
                <span className="text-white whitespace-nowrap">USD ${gold.usd.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                {gold.change24hPct !== null && (
                  <>
                    <span className="text-white/60">|</span>
                    <div className="flex items-center gap-2">
                      {gold.change24hPct < 0 && (
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      {gold.change24hPct >= 0 && (
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`tabular-nums ${gold.change24hPct >= 0 ? 'text-green-400' : 'text-red-400'}`} style={changeFont}>
                        {formatChange24h(gold.change24hPct)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-white/60 text-center" style={valueFont}>
                DATA UNAVAILABLE
              </div>
            )}
          </div>
        </div>

        {/* Silver Card */}
        <div className="flex flex-col shadow-xl">
          <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
            <h2 className="text-white text-center tracking-wider uppercase" style={headerFont}>
              SILVER (XAG) - SATS PER TROY OUNCE
            </h2>
          </div>
          <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
            {silver && silver.usd > 0 ? (
              <div className="text-white tabular-nums flex items-center gap-3 whitespace-nowrap justify-center" style={valueFont}>
                <span>{formatSats(silver.sats).number} <i className="fak fa-regular"></i></span>
                <span className="text-white/60">|</span>
                <span className="text-white whitespace-nowrap">USD ${silver.usd.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                {silver.change24hPct !== null && (
                  <>
                    <span className="text-white/60">|</span>
                    <div className="flex items-center gap-2">
                      {silver.change24hPct < 0 && (
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      {silver.change24hPct >= 0 && (
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`tabular-nums ${silver.change24hPct >= 0 ? 'text-green-400' : 'text-red-400'}`} style={changeFont}>
                        {formatChange24h(silver.change24hPct)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-white/60 text-center" style={valueFont}>
                DATA UNAVAILABLE
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}



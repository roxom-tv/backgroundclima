"use client";

import { motion } from "framer-motion";
import { useMarketsSats } from "@/hooks/useMarketsSats";
import { formatSats } from "@/lib/fmt";

export default function FxSlide() {
  const { data, loading } = useMarketsSats();

  // Estilos estandarizados (mismo que USDStats)
  const headerPadding = "px-4 py-4";
  const contentPadding = "px-6 py-10";
  const headerFont = { fontSize: 'clamp(27px, 2vw, 39px)', lineHeight: '1', fontWeight: 900 };
  const valueFont = { fontSize: 'clamp(32px, 3vw, 56px)', lineHeight: '1', fontWeight: 900 };
  
  // Specific colors from USDStats
  const headerBgColor = "bg-[#EF4444]/80"; // Bright red with 20% transparency
  const contentBgColor = "bg-[#1A1A1A]/80"; // Dark gray with 20% transparency

  const fx = data?.fx;
  const hasData = fx && (fx.EUR.satsPerUnit > 0 || fx.JPY.satsPerUnit > 0 || fx.GBP.satsPerUnit > 0 || fx.USD.satsPerUnit > 0);

  // Helper function to render country flag SVG
  const FlagIcon = ({ country }: { country: 'EUR' | 'JPY' | 'GBP' | 'USD' }) => {
    const flagSize = 'clamp(24px, 2.5vw, 40px)';
    
    if (country === 'EUR') {
      return (
        <svg width={flagSize} height={flagSize} viewBox="0 0 36 24" className="inline-block mr-2" style={{ verticalAlign: 'middle' }}>
          <rect width="36" height="24" fill="#003399"/>
          <circle cx="18" cy="12" r="8" fill="#FFCC00"/>
          <circle cx="18" cy="12" r="6" fill="#003399"/>
          <circle cx="18" cy="12" r="4" fill="#FFCC00"/>
        </svg>
      );
    } else if (country === 'JPY') {
      return (
        <svg width={flagSize} height={flagSize} viewBox="0 0 36 24" className="inline-block mr-2" style={{ verticalAlign: 'middle' }}>
          <rect width="36" height="24" fill="#FFFFFF"/>
          <circle cx="18" cy="12" r="7" fill="#BC002D"/>
        </svg>
      );
    } else if (country === 'GBP') {
      return (
        <svg width={flagSize} height={flagSize} viewBox="0 0 36 24" className="inline-block mr-2" style={{ verticalAlign: 'middle' }}>
          <rect width="36" height="24" fill="#012169"/>
          <path d="M0 0 L36 24 M36 0 L0 24" stroke="#FFFFFF" strokeWidth="2.4"/>
          <path d="M0 12 L36 12 M18 0 L18 24" stroke="#FFFFFF" strokeWidth="4"/>
          <path d="M0 0 L36 24 M36 0 L0 24" stroke="#C8102E" strokeWidth="1.6"/>
          <path d="M0 12 L36 12 M18 0 L18 24" stroke="#C8102E" strokeWidth="2.4"/>
        </svg>
      );
    } else if (country === 'USD') {
      return (
        <svg width={flagSize} height={flagSize} viewBox="0 0 36 24" className="inline-block mr-2" style={{ verticalAlign: 'middle' }}>
          <rect width="36" height="24" fill="#B22234"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="2.67"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="5.34"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="8.01"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="10.68"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="13.35"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="16.02"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="18.69"/>
          <rect width="36" height="2.67" fill="#FFFFFF" y="21.36"/>
          <rect width="14.4" height="10.67" fill="#3C3B6E" x="0" y="0"/>
          <circle cx="3.6" cy="2.67" r="0.8" fill="#FFFFFF"/>
          <circle cx="7.2" cy="2.67" r="0.8" fill="#FFFFFF"/>
          <circle cx="10.8" cy="2.67" r="0.8" fill="#FFFFFF"/>
          <circle cx="5.4" cy="4.67" r="0.8" fill="#FFFFFF"/>
          <circle cx="9" cy="4.67" r="0.8" fill="#FFFFFF"/>
        </svg>
      );
    }
    return null;
  };

  const currencies = [
    { code: "EUR", name: "Euro", data: fx?.EUR, flag: 'EUR' as const },
    { code: "JPY", name: "Japanese Yen", data: fx?.JPY, flag: 'JPY' as const },
    { code: "GBP", name: "British Pound", data: fx?.GBP, flag: 'GBP' as const },
    { code: "USD", name: "US Dollar", data: fx?.USD, flag: 'USD' as const },
  ];

  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center p-8 relative bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* FX/Currency Exchange Symbol Background - Centered and Faded */}
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
            {/* Global Currency Exchange - Multiple Currency Symbols */}
            <g transform="translate(200, 200)">
              {/* Central Globe/World */}
              <circle cx="0" cy="0" r="80" fill="none" stroke="#4169E1" strokeWidth="4" opacity="0.5"/>
              {/* Latitude lines */}
              <ellipse cx="0" cy="0" rx="80" ry="40" fill="none" stroke="#4169E1" strokeWidth="2" opacity="0.4"/>
              <ellipse cx="0" cy="0" rx="80" ry="20" fill="none" stroke="#4169E1" strokeWidth="2" opacity="0.4"/>
              {/* Longitude lines */}
              <path d="M 0 -80 Q 40 0 0 80" fill="none" stroke="#4169E1" strokeWidth="2" opacity="0.4"/>
              <path d="M 0 -80 Q -40 0 0 80" fill="none" stroke="#4169E1" strokeWidth="2" opacity="0.4"/>
              
              {/* Currency symbols around the globe */}
              {/* USD - Top */}
              <g transform="translate(0, -120)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#4169E1" strokeWidth="3" opacity="0.6"/>
                <text x="0" y="8" textAnchor="middle" fill="#4169E1" fontSize="24" fontWeight="bold" opacity="0.6">$</text>
                <text x="0" y="45" textAnchor="middle" fill="#4169E1" fontSize="14" fontWeight="bold" opacity="0.5">USD</text>
              </g>
              
              {/* EUR - Right */}
              <g transform="translate(120, 0)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#4169E1" strokeWidth="3" opacity="0.6"/>
                <text x="0" y="8" textAnchor="middle" fill="#4169E1" fontSize="24" fontWeight="bold" opacity="0.6">€</text>
                <text x="0" y="45" textAnchor="middle" fill="#4169E1" fontSize="14" fontWeight="bold" opacity="0.5">EUR</text>
              </g>
              
              {/* GBP - Bottom */}
              <g transform="translate(0, 120)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#4169E1" strokeWidth="3" opacity="0.6"/>
                <text x="0" y="8" textAnchor="middle" fill="#4169E1" fontSize="24" fontWeight="bold" opacity="0.6">£</text>
                <text x="0" y="45" textAnchor="middle" fill="#4169E1" fontSize="14" fontWeight="bold" opacity="0.5">GBP</text>
              </g>
              
              {/* JPY - Left */}
              <g transform="translate(-120, 0)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#4169E1" strokeWidth="3" opacity="0.6"/>
                <text x="0" y="8" textAnchor="middle" fill="#4169E1" fontSize="24" fontWeight="bold" opacity="0.6">¥</text>
                <text x="0" y="45" textAnchor="middle" fill="#4169E1" fontSize="14" fontWeight="bold" opacity="0.5">JPY</text>
              </g>
              
              {/* Exchange arrows connecting to globe */}
              <path d="M 0 -90 L 0 -80" stroke="#4169E1" strokeWidth="3" opacity="0.4" markerEnd="url(#arrowhead)"/>
              <path d="M 90 0 L 80 0" stroke="#4169E1" strokeWidth="3" opacity="0.4" markerEnd="url(#arrowhead)"/>
              <path d="M 0 90 L 0 80" stroke="#4169E1" strokeWidth="3" opacity="0.4" markerEnd="url(#arrowhead)"/>
              <path d="M -90 0 L -80 0" stroke="#4169E1" strokeWidth="3" opacity="0.4" markerEnd="url(#arrowhead)"/>
              
              {/* Arrow marker definition */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#4169E1" opacity="0.4"/>
                </marker>
              </defs>
            </g>
          </svg>
        </div>
      </div>

      {/* Content Container - z-10 to sit above symbol */}
      <div className="relative z-10 w-full h-full flex flex-col gap-6 justify-center">
        
        {/* Grid de 2x2 para las monedas */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {currencies.map((currency) => (
            <div key={currency.code} className="flex flex-col shadow-xl">
              <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
                <h2 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                  {currency.code} - SATS PER UNIT
                </h2>
              </div>
              <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
                {loading && !hasData && !data ? (
                  <div className="text-white text-center" style={valueFont}>
                    LOADING...
                  </div>
                ) : currency.data && currency.data.satsPerUnit > 0 ? (
                  <div className="text-white tabular-nums flex items-center gap-2 whitespace-nowrap justify-center" style={valueFont}>
                    <FlagIcon country={currency.flag} />
                    <span>1 {currency.code} = {formatSats(currency.data.satsPerUnit).number}</span>
                    <i className="fak fa-regular"></i>
                  </div>
                ) : (
                  <div className="text-white/60 text-center" style={valueFont}>
                    DATA UNAVAILABLE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

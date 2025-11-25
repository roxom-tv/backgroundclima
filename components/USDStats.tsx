"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatBTC, formatBTCMain } from "@/lib/fmt";
import { useBTCPrice } from "@/hooks/useBTCPrice";

interface USDStatsProps {
  liveDebtUSD: number;
  perSecond: number;
  base: number;
  annualFederalSpending: number;
  annualBudgetDeficit: number;
  initialBtcPrice: number;
}

const US_POPULATION = 336_000_000;
const US_TAXPAYERS = 134_000_000;
const US_GDP = 28.3; // in trillions USD

export default function USDStats({ perSecond, base, annualFederalSpending, annualBudgetDeficit, initialBtcPrice }: USDStatsProps) {
  const [current, setCurrent] = useState(base);
  const btcPrice = useBTCPrice(initialBtcPrice);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => prev + perSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [perSecond]);

  // Convert all values to BTC
  const currentBTC = current / btcPrice;
  const debtPerCitizenBTC = (current / US_POPULATION) / btcPrice;
  const debtPerTaxpayerBTC = (current / US_TAXPAYERS) / btcPrice;
  const annualFederalSpendingBTC = annualFederalSpending / btcPrice;
  const annualBudgetDeficitBTC = annualBudgetDeficit / btcPrice;
  const debtToGDPRatio = (current / (US_GDP * 1_000_000_000_000)) * 100;

  // Estilos estandarizados
  const headerPadding = "px-4 py-4";
  const contentPadding = "px-6 py-10";
  const headerFont = { fontSize: 'clamp(24px, 2vw, 36px)', lineHeight: '1', fontWeight: 900 };
  const valueFont = { fontSize: 'clamp(32px, 3vw, 56px)', lineHeight: '1', fontWeight: 900 };
  
  // Specific colors from reference
  const headerBgColor = "bg-[#EF4444]/80"; // Bright red with 20% transparency (from original)
  const contentBgColor = "bg-[#1A1A1A]/80"; // Dark gray with 20% transparency (from original)

  return (
    <div className="w-full h-full flex flex-col gap-6 p-8 justify-center bg-transparent relative">
      
      {/* US Map Background - Centered and Faded */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-100 pointer-events-none brightness-150">
        <div className="relative w-full h-full flex items-center justify-center">
          <Image 
            src="/Vector.png"
            alt="US Map Background" 
            fill
            className="object-contain p-10"
            style={{
              filter: 'drop-shadow(0 0 3px white)'
            }}
            priority
          />
        </div>
      </div>

      {/* Content Container - z-10 to sit above map */}
      <div className="relative z-10 flex flex-col gap-6 w-full h-full justify-center">
        
        {/* First Row: US National Debt, Debt Per Citizen, Debt Per Taxpayer */}
        <div className="grid grid-cols-3 gap-6 w-full">
          {/* US National Debt */}
          <div className="flex flex-col shadow-xl">
            <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
              <h2 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                US NATIONAL DEBT — (BTC Needed at Current Price)
              </h2>
            </div>
            <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
              <div
                className="text-white tabular-nums text-center whitespace-nowrap"
                style={valueFont}
                aria-live="polite"
              >
                {formatBTCMain(currentBTC)}
              </div>
            </div>
          </div>

          {/* Debt Per Citizen */}
          <div className="flex flex-col shadow-xl">
            <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
              <h3 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                DEBT PER CITIZEN
              </h3>
            </div>
            <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
              <div className="text-white tabular-nums text-center" style={valueFont}>
                {formatBTC(debtPerCitizenBTC)}
              </div>
            </div>
          </div>

          {/* Debt Per Taxpayer */}
          <div className="flex flex-col shadow-xl">
            <div className={`${headerBgColor} flex items-center justify-center ${headerPadding} h-32`}>
              <h3 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                DEBT PER TAXPAYER
              </h3>
            </div>
            <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
              <div className="text-white tabular-nums text-center" style={valueFont}>
                {formatBTC(debtPerTaxpayerBTC)}
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Federal Spending and Budget Deficit */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {/* US Federal Spending */}
          <div className="flex flex-col shadow-xl">
            <div className={`${headerBgColor} flex items-center justify-center ${headerPadding}`}>
              <h3 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                US FEDERAL SPENDING (OFFICIAL)
              </h3>
            </div>
            <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
              <div className="text-white tabular-nums text-center" style={valueFont}>
                {annualFederalSpendingBTC > 0 ? formatBTC(annualFederalSpendingBTC) : "N/A"}
              </div>
            </div>
          </div>

          {/* US Federal Budget Deficit */}
          <div className="flex flex-col shadow-xl">
            <div className={`${headerBgColor} flex items-center justify-center ${headerPadding}`}>
              <h3 className="text-white text-center tracking-wider uppercase" style={headerFont}>
                US FEDERAL BUDGET DEFICIT (OFFICIAL)
              </h3>
            </div>
            <div className={`flex items-center justify-center flex-1 ${contentBgColor} ${contentPadding}`}>
              <div className="text-white tabular-nums text-center" style={valueFont}>
                {annualBudgetDeficitBTC > 0 ? formatBTC(annualBudgetDeficitBTC) : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Debt to GDP Ratio */}
        <div className="flex flex-col shadow-xl">
          <div className={`${headerBgColor} flex items-center justify-center ${headerPadding}`}>
            <h3 className="text-white text-center tracking-wider uppercase" style={headerFont}>
              US FEDERAL DEBT TO GDP RATIO
            </h3>
          </div>
          <div className={`flex items-center justify-between px-12 py-6 flex-1 ${contentBgColor}`}>
            {/* 1960 */}
            <div className="flex items-center gap-4">
              <span className="text-white text-3xl font-bold">1960</span>
              <div className="bg-white px-4 py-2 min-w-[140px] flex justify-center">
                <span className="text-red-600 text-3xl font-black">52.19%</span>
              </div>
            </div>
            {/* 1980 */}
            <div className="flex items-center gap-4">
              <span className="text-white text-3xl font-bold">1980</span>
              <div className="bg-white px-4 py-2 min-w-[140px] flex justify-center">
                <span className="text-red-600 text-3xl font-black">34.71%</span>
              </div>
            </div>
            {/* 2000 */}
            <div className="flex items-center gap-4">
              <span className="text-white text-3xl font-bold">2000</span>
              <div className="bg-white px-4 py-2 min-w-[140px] flex justify-center">
                <span className="text-red-600 text-3xl font-black">55.42%</span>
              </div>
            </div>
            {/* NOW */}
            <div className="flex items-center gap-4">
              <span className="text-white text-3xl font-bold">NOW</span>
              <div className="bg-white px-4 py-2 min-w-[140px] flex justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <span className="text-red-600 text-3xl font-black">
                  {debtToGDPRatio.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      
      </div>
    </div>
  );
}

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
const DOGE_SAVED = 705.483012863; // in billions USD

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
  const savingsPerTaxpayerBTC = ((DOGE_SAVED * 1_000_000_000) / US_TAXPAYERS) / btcPrice;
  const annualFederalSpendingBTC = annualFederalSpending / btcPrice;
  const annualBudgetDeficitBTC = annualBudgetDeficit / btcPrice;
  const debtToGDPRatio = (current / (US_GDP * 1_000_000_000_000)) * 100;

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4">
      {/* First Row: US National Debt, Debt Per Citizen, Debt Per Taxpayer */}
      <div className="flex gap-6 flex-1">
        {/* US National Debt */}
        <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col">
          <div className="bg-debt-red flex items-center justify-center py-4">
            <h2 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(32px, 3vw, 48px)', lineHeight: '1' }}>
              US NATIONAL DEBT
            </h2>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div
              className="font-black text-white tabular-nums text-center"
              style={{ fontSize: 'clamp(40px, 4vw, 64px)', lineHeight: '1' }}
              aria-live="polite"
              aria-label={`Current estimated U.S. debt: ${formatBTCMain(currentBTC)}`}
            >
              {formatBTCMain(currentBTC)}
            </div>
          </div>
        </div>

        {/* Debt Per Citizen */}
        <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col">
          <div className="bg-debt-red flex items-center justify-center px-2 py-4">
            <h3 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>
              DEBT PER CITIZEN
            </h3>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(36px, 3.5vw, 56px)', lineHeight: '1' }}>
              {formatBTC(debtPerCitizenBTC)}
            </div>
          </div>
        </div>

        {/* Debt Per Taxpayer */}
        <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col">
          <div className="bg-debt-red flex items-center justify-center px-2 py-4">
            <h3 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>
              DEBT PER TAXPAYER
            </h3>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(36px, 3.5vw, 56px)', lineHeight: '1' }}>
              {formatBTC(debtPerTaxpayerBTC)}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Federal Spending and Budget Deficit */}
      <div className="flex gap-6 flex-1">
        {/* US Federal Spending */}
        <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col">
          <div className="bg-debt-red flex items-center justify-center px-2 py-4">
            <h3 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>
              US FEDERAL SPENDING (OFFICIAL)
            </h3>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(32px, 3.5vw, 52px)', lineHeight: '1' }}>
              {formatBTC(annualFederalSpendingBTC)}
            </div>
          </div>
        </div>

        {/* US Federal Budget Deficit */}
        <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col">
          <div className="bg-debt-red flex items-center justify-center px-2 py-4">
            <h3 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>
              US FEDERAL BUDGET DEFICIT (OFFICIAL)
            </h3>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(32px, 3.5vw, 52px)', lineHeight: '1' }}>
              {formatBTC(annualBudgetDeficitBTC)}
            </div>
          </div>
        </div>
      </div>

      {/* Third Row: DOGE Clock and Savings Per Taxpayer */}
      <div className="flex gap-6 flex-1 items-start justify-center" style={{ marginTop: '35px' }}>
        {/* DOGE Clock Card with Logo */}
        <div className="relative flex flex-col" style={{ width: '35%' }}>
          {/* DOGE Logo - positioned on left side, overlapping */}
          <div className="absolute" style={{ left: '-8vw', top: '-2vh', zIndex: 10 }}>
            <Image 
              src="/Doge 1.png" 
              alt="D.O.G.E Logo" 
              width={210}
              height={210}
              className="object-contain"
              style={{ width: 'clamp(120px, 12vw, 210px)', height: 'auto' }}
            />
          </div>
          
          {/* DOGE Clock Card */}
          <div className="bg-debt-bg overflow-hidden flex-1 flex flex-col" style={{ paddingBottom: '15px' }}>
            <div className="bg-debt-yellow flex items-center justify-center px-2 py-4">
              <h3 className="font-black text-gray-900 text-center tracking-wide" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>
                D.O.G.E CLOCK
              </h3>
            </div>
            <div className="flex items-center justify-center bg-debt-bg" style={{ minHeight: '98px', padding: '20px', width: '100%' }}>
              <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(36px, 3.5vw, 56px)', lineHeight: '1', width: '100%' }}>
                {formatBTC((DOGE_SAVED * 1_000_000_000) / btcPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Per Taxpayer */}
        <div className="bg-debt-bg overflow-hidden flex flex-col" style={{ width: '35%', paddingBottom: '15px' }}>
          <div className="bg-debt-yellow flex items-center justify-center px-2 py-4">
            <h3 className="font-black text-gray-900 text-center tracking-wide" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>
              SAVINGS PER TAXPAYER
            </h3>
          </div>
          <div className="flex items-center justify-center bg-debt-bg" style={{ minHeight: '98px', padding: '20px', width: '100%' }}>
            <div className="font-black text-white tabular-nums text-center" style={{ fontSize: 'clamp(36px, 3.5vw, 56px)', lineHeight: '1', width: '100%' }}>
              {formatBTC(savingsPerTaxpayerBTC)}
            </div>
          </div>
        </div>
      </div>

      {/* Fourth Row: Debt to GDP Ratio */}
      <div className="bg-debt-bg overflow-hidden w-full flex flex-col">
        <div className="bg-debt-red flex items-center justify-center px-2 py-4">
          <h3 className="font-black text-white text-center tracking-wide" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>
            US FEDERAL DEBT TO GDP RATIO
          </h3>
        </div>
        <div className="flex items-center justify-center gap-4 px-4 py-4 flex-1">
          {/* 1960 */}
          <div className="bg-white flex items-center justify-center gap-3 px-4 flex-1" style={{ minHeight: '60px' }}>
            <div className="font-black text-gray-900" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>1960</div>
            <div className="font-black text-debt-red" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>52.19%</div>
          </div>
          {/* 1980 */}
          <div className="bg-white flex items-center justify-center gap-3 px-4 flex-1" style={{ minHeight: '60px' }}>
            <div className="font-black text-gray-900" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>1980</div>
            <div className="font-black text-debt-red" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>34.71%</div>
          </div>
          {/* 2000 */}
          <div className="bg-white flex items-center justify-center gap-3 px-4 flex-1" style={{ minHeight: '60px' }}>
            <div className="font-black text-gray-900" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>2000</div>
            <div className="font-black text-debt-red" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>55.42%</div>
          </div>
          {/* NOW */}
          <div className="bg-white flex items-center justify-center gap-3 px-4 flex-1" style={{ minHeight: '60px' }}>
            <div className="font-black text-gray-900" style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: '1' }}>NOW</div>
            <div className="font-black text-debt-red" style={{ fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: '1' }}>
              {debtToGDPRatio.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


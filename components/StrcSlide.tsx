'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface StrcData {
  strc: {
    price: number;
    previousClose: number;
    priceChange: number;
    priceChangePercent: number;
    negative: boolean;
    volume: number;
  };
  btc: { price: number };
  dividends: Array<{
    period: string;
    recordDate: string;
    payDate: string;
    usd: number;
    rate: number;
    btc: number;
  }>;
  metrics: {
    parValue: number;
    annualDiv: number;
    annualRate: number;
    monthlyDiv: number;
    monthlyDivBtc: number;
    annualDivBtc: number;
    effYield: number;
    marketCap: number;
    sharesOutstanding: number;
    nextPayoutDate: string;
    nextRecordDate: string;
    sharpeRatio?: number;
    annualizedVolatility?: number;
    vwap1mo?: number;
    mstrPrice?: number;
    correlations?: { mstr: number; spy: number; btc: number; pff?: number };
  };
  lastUpdate: string;
}

const STRC_DATA_URL = '/api/strc/data';
const MONO = "var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace";
const SANS = "'Inter', sans-serif";

const BTC = (n: number) => n.toFixed(8) + ' ₿';
const USD = (n: number, d = 2) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const toBtc = (usd: number, btcPrice: number) => btcPrice > 0 ? usd / btcPrice : 0;

let sharedData: StrcData | null = null;
let fetchPromise: Promise<StrcData | null> | null = null;

function hasDataChanged(prev: StrcData | null, next: StrcData): boolean {
  if (!prev) return true;
  return prev.strc.price !== next.strc.price
    || prev.strc.volume !== next.strc.volume
    || prev.btc.price !== next.btc.price;
}

async function fetchStrcInternal(
  setData?: (v: StrcData | null) => void,
  setLoading?: (v: boolean) => void,
  setError?: (v: string | null) => void,
): Promise<StrcData | null> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    if (!sharedData) setLoading?.(true);
    try {
      const res = await fetch(STRC_DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`STRC API returned ${res.status}`);
      const data: StrcData = await res.json();
      if (hasDataChanged(sharedData, data)) {
        sharedData = data;
        setData?.(data);
      }
      setError?.(null);
      return data;
    } catch (err) {
      setError?.(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      if (!sharedData) setLoading?.(false);
      fetchPromise = null;
    }
  })();
  return fetchPromise;
}

export async function prefetchStrcData(): Promise<StrcData | null> {
  if (sharedData) return sharedData;
  return fetchStrcInternal();
}

export default function StrcSlide() {
  const [data, setData] = useState<StrcData | null>(sharedData);
  const [loading, setLoading] = useState(!sharedData);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevBtcRef = React.useRef<number | null>(null);

  const load = useCallback(async () => {
    await fetchStrcInternal(setData, setLoading, setError);
  }, []);

  useEffect(() => {
    if (sharedData) { setData(sharedData); setLoading(false); }
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const s = toBtc(data.strc.price, data.btc.price);
    if (prevBtcRef.current !== null && s !== prevBtcRef.current) {
      setFlash(s > prevBtcRef.current ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 1500);
      prevBtcRef.current = s;
      return () => clearTimeout(t);
    }
    prevBtcRef.current = s;
  }, [data]);

  if (loading) {
    return (
      <div style={{ height: '100%', width: '100%', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F8FAFC', fontSize: 24, fontFamily: MONO, animation: 'strc-blink 2s ease-in-out infinite', letterSpacing: 4 }}>LOADING STRC...</div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%', width: '100%', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#EF4444', fontSize: 20, fontFamily: MONO }}>Error loading STRC data</div>
      </motion.div>
    );
  }

  const { strc, btc, dividends, metrics, lastUpdate } = data;
  const b = btc.price;
  const s = toBtc(strc.price, b);
  const ps = toBtc(strc.previousClose, b);
  const diff = s - ps;
  const sign = diff >= 0 ? '+' : '';
  const isUp = diff >= 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayDiv = dividends.find((x) => x.payDate === today);
  const isActive = !!todayDiv;

  const atmBtc = isActive
    ? (todayDiv!.btc ?? toBtc(todayDiv!.usd, b))
    : toBtc(metrics.monthlyDiv, b);
  const atmUsd = isActive ? todayDiv!.usd : metrics.monthlyDiv;

  let nextLabel = '';
  if (!isActive && metrics.nextPayoutDate) {
    const days = Math.ceil((new Date(metrics.nextPayoutDate).getTime() - new Date(today).getTime()) / 86400000);
    nextLabel = `Next payout: ${metrics.nextPayoutDate} (${days}d)`;
  }

  const cor = metrics.correlations;
  const stats: Array<{ l: string; v: string; u?: string; c?: string }> = [
    { l: 'Par Value', v: BTC(toBtc(metrics.parValue, b)), u: USD(metrics.parValue), c: 'gold' },
    { l: 'Eff. Yield', v: (metrics.effYield ?? 0).toFixed(2) + '%', c: 'green' },
    { l: 'Monthly Div', v: BTC(metrics.monthlyDivBtc ?? toBtc(metrics.monthlyDiv, b)), u: USD(metrics.monthlyDiv, 4), c: 'gold' },
    { l: 'Annual Div', v: BTC(metrics.annualDivBtc ?? toBtc(metrics.annualDiv, b)), u: USD(metrics.annualDiv, 2), c: 'gold' },
    { l: 'Market Cap', v: (metrics.marketCap / b).toFixed(0) + ' BTC', u: USD(metrics.marketCap, 0) },
    { l: 'Volume', v: strc.volume.toLocaleString('en-US') },
    { l: 'Shares', v: (metrics.sharesOutstanding / 1e6).toFixed(2) + 'M' },
    { l: 'MSTR', v: metrics.mstrPrice ? USD(metrics.mstrPrice) : '—' },
    { l: 'Sharpe', v: metrics.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : '—', c: 'green' },
    { l: 'Ann. Vol', v: metrics.annualizedVolatility != null ? metrics.annualizedVolatility + '%' : '—' },
    { l: 'VWAP 1M', v: metrics.vwap1mo != null ? USD(metrics.vwap1mo, 2) : '—' },
    { l: 'Corr', v: cor ? `M${cor.mstr} S${cor.spy} B${cor.btc}` : '—' },
  ];

  const ts = new Date(lastUpdate);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#020617', color: '#F8FAFC', fontFamily: SANS }}
    >
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 90, borderBottom: '1px solid #1E293B', flexShrink: 0, animation: 'strc-fadeUp 0.3s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, letterSpacing: 6, color: '#FBBF24' }}>STRC</span>
          <div style={{ width: 1, height: 40, background: '#1E293B' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{
              fontFamily: MONO, fontSize: 48, fontWeight: 700,
              color: flash === 'up' ? '#22C55E' : flash === 'down' ? '#EF4444' : '#F8FAFC',
              transition: flash ? 'none' : 'color 1.5s',
            }}>
              {BTC(s)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 48, fontWeight: 600, color: '#22C55E' }}>{USD(strc.price)}</span>
            <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: isUp ? '#22C55E' : '#EF4444' }}>
              {sign}{diff.toFixed(8)} ₿
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 36, color: '#64748B' }}>
            BTC <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{USD(b, 0)}</span>
          </span>
          <div style={{ width: 8, height: 8, background: '#22C55E', borderRadius: '50%', animation: 'strc-blink 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* ATM */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, borderBottom: '1px solid #1E293B', minHeight: 0, animation: 'strc-fadeUp 0.3s ease-out 0.05s both' }}>
        <div style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700, letterSpacing: 8, color: '#FBBF24', marginBottom: 16 }}>TODAY&apos;S ATM</div>
        <div style={{
          fontFamily: MONO, fontSize: 38, fontWeight: 700, letterSpacing: 4, padding: '8px 32px', borderRadius: 8, marginBottom: 20,
          color: isActive ? '#22C55E' : '#FBBF24',
          border: isActive ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(251,191,36,0.3)',
          background: isActive ? 'rgba(34,197,94,0.06)' : 'rgba(251,191,36,0.04)',
        }}>
          {isActive ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{ fontFamily: MONO, fontSize: 110, fontWeight: 700, color: '#FBBF24', lineHeight: 1 }}>
            {isActive ? '' : '~'}{BTC(atmBtc)}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 72, color: '#64748B', fontWeight: 300 }}>/</span>
          <span style={{ fontFamily: MONO, fontSize: 110, fontWeight: 700, color: '#22C55E' }}>{USD(atmUsd, 4)}</span>
        </div>
        {nextLabel && <div style={{ fontFamily: MONO, fontSize: 26, color: '#64748B', marginTop: 16 }}>{nextLabel}</div>}
      </div>

      {/* Stats Grid 4x3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: '1fr 1fr 1fr', flexShrink: 0, borderBottom: '1px solid #1E293B', animation: 'strc-fadeUp 0.3s ease-out 0.1s both' }}>
        {stats.map((st, i) => (
          <div key={st.l} style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            padding: '16px 12px',
            borderRight: (i + 1) % 4 === 0 ? 'none' : '1px solid #1E293B',
            borderBottom: i < 8 ? '1px solid #1E293B' : 'none',
          }}>
            <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#64748B', marginBottom: 6 }}>{st.l}</div>
            <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, lineHeight: 1.2, color: st.c === 'gold' ? '#FBBF24' : st.c === 'green' ? '#22C55E' : '#F8FAFC' }}>{st.v}</div>
            {st.u && <div style={{ fontFamily: MONO, fontSize: 24, color: '#22C55E', marginTop: 2 }}>{st.u}</div>}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 56px', height: 24, flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#64748B' }}>Updated {ts.toLocaleTimeString('en-US', { hour12: false })}</span>
      </div>

      <style jsx global>{`
        @keyframes strc-blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes strc-fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </motion.div>
  );
}

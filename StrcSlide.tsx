'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// ── Types ──
interface StrcData {
  strc: {
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    sharesOutstanding: number;
  };
  btc: { price: number };
  dividends: Array<{
    date: string;
    usd: number;
    btcPrice: number;
    sats: number;
  }>;
  metrics: {
    parValue: number;
    annualDiv: number;
    annualRate: number;
    monthlyDiv: number;
    monthlyDivSats: number;
    annualDivSats: number;
    yieldPercent: number;
    marketCap: number;
    sharesOutstanding: number;
  };
  lastUpdate: string;
}

// ── Config ──
// Always same-origin: Next.js route proxies to STRC_UPSTREAM_URL (server env on Vercel).
const STRC_DATA_URL = '/api/strc/data';

// ── Helpers ──
const fmtSats = (n: number) => n.toLocaleString('en-US');
const fmtUSD = (n: number, d = 2) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const toSats = (usd: number, btc: number) => Math.round((usd / btc) * 1e8);

// ── Shared fetch state ──
let sharedData: StrcData | null = null;
let sharedLoading = false;
let fetchPromise: Promise<StrcData | null> | null = null;

async function fetchStrcInternal(
  setData?: (v: StrcData | null) => void,
  setLoading?: (v: boolean) => void,
  setError?: (v: string | null) => void,
): Promise<StrcData | null> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    sharedLoading = true;
    setLoading?.(true);
    try {
      const res = await fetch(STRC_DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`STRC API returned ${res.status}`);
      const data: StrcData = await res.json();
      sharedData = data;
      setData?.(data);
      setError?.(null);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError?.(msg);
      console.error('STRC fetch error:', err);
      return null;
    } finally {
      sharedLoading = false;
      setLoading?.(false);
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export async function prefetchStrcData(): Promise<StrcData | null> {
  if (sharedData) return sharedData;
  return fetchStrcInternal();
}

// ── Component ──
export default function StrcSlide() {
  const [data, setData] = useState<StrcData | null>(sharedData);
  const [loading, setLoading] = useState(!sharedData || sharedLoading);
  const [error, setError] = useState<string | null>(null);
  const [prevSats, setPrevSats] = useState<number | null>(null);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  const load = useCallback(async () => {
    await fetchStrcInternal(setData, setLoading, setError);
  }, []);

  useEffect(() => {
    if (sharedData) {
      setData(sharedData);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  // Flash effect on sats change
  useEffect(() => {
    if (!data) return;
    const sats = toSats(data.strc.price, data.btc.price);
    if (prevSats !== null && sats !== prevSats) {
      setFlash(sats > prevSats ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 1500);
      return () => clearTimeout(t);
    }
    setPrevSats(sats);
  }, [data, prevSats]);

  if (loading) {
    return (
      <div className="h-full w-full bg-[#020617] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse tracking-wider font-mono">
          LOADING STRC DATA...
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full w-full bg-[#020617] flex items-center justify-center"
      >
        <div className="text-red-500 text-xl font-mono">
          Error loading STRC data
        </div>
      </motion.div>
    );
  }

  const { strc, btc, dividends, metrics, lastUpdate } = data;
  const b = btc.price;
  const s = toSats(strc.price, b);
  const ps = toSats(strc.previousClose, b);
  const diff = s - ps;
  const sign = diff >= 0 ? '+' : '';
  const isUp = diff >= 0;

  // ATM logic
  const today = new Date().toISOString().slice(0, 10);
  const todayDiv = dividends.find((x) => x.date === today);
  const isActive = !!todayDiv;

  const atmSats = isActive
    ? todayDiv!.sats
    : toSats(metrics.monthlyDiv, b);
  const atmUsd = isActive ? todayDiv!.usd : metrics.monthlyDiv;

  // Next dividend
  let nextLabel = '';
  if (!isActive) {
    const future = dividends
      .filter((x) => x.date > today)
      .sort((a, c) => a.date.localeCompare(c.date));
    if (future.length) {
      const days = Math.ceil(
        (new Date(future[0].date).getTime() - new Date(today).getTime()) / 86400000,
      );
      nextLabel = `Next: ${future[0].date} (${days}d)`;
    } else {
      const now = new Date();
      const nx = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      nextLabel = `Est. next in ${Math.ceil((nx.getTime() - now.getTime()) / 86400000)}d`;
    }
  }

  // Stats
  const parS = toSats(metrics.parValue, b);
  const stats = [
    { l: 'Par Value', v: fmtSats(parS) + ' sats', u: fmtUSD(metrics.parValue), gold: true },
    { l: 'Yield', v: metrics.yieldPercent.toFixed(2) + '%', green: true },
    { l: 'Monthly Div', v: fmtSats(metrics.monthlyDivSats) + ' sats', u: fmtUSD(metrics.monthlyDiv, 4), gold: true },
    { l: 'Annual Div', v: fmtSats(metrics.annualDivSats) + ' sats', u: fmtUSD(metrics.annualDiv, 4), gold: true },
    { l: 'Market Cap', v: (metrics.marketCap / b).toFixed(0) + ' BTC', u: fmtUSD(metrics.marketCap, 0) },
    { l: 'Volume', v: strc.volume.toLocaleString('en-US') },
    { l: 'Prev Close', v: fmtSats(toSats(strc.previousClose, b)) + ' sats', u: fmtUSD(strc.previousClose) },
    { l: 'Shares', v: (metrics.sharesOutstanding / 1e6).toFixed(2) + 'M' },
  ];

  const ts = new Date(lastUpdate);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full flex flex-col overflow-hidden"
      style={{
        background: '#020617',
        color: '#F8FAFC',
        fontFamily: "'Fira Sans', sans-serif",
      }}
    >
      {/* ── Topbar ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: '0 40px',
          height: '90px',
          borderBottom: '1px solid #1E293B',
        }}
      >
        <div className="flex items-center gap-6">
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '44px',
              fontWeight: 700,
              letterSpacing: '6px',
              color: '#FBBF24',
            }}
          >
            STRC
          </span>
          <div style={{ width: 1, height: 40, background: '#1E293B' }} />
          <div className="flex items-baseline gap-4">
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '48px',
                fontWeight: 700,
                color: flash === 'up' ? '#22C55E' : flash === 'down' ? '#EF4444' : '#F8FAFC',
                transition: flash ? 'none' : 'color 1.5s',
              }}
            >
              {fmtSats(s)} sats
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '48px',
                fontWeight: 600,
                color: '#22C55E',
              }}
            >
              {fmtUSD(strc.price)}
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '32px',
                fontWeight: 600,
                color: isUp ? '#22C55E' : '#EF4444',
              }}
            >
              {sign}{diff.toLocaleString('en-US')} sats
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '36px',
              color: '#64748B',
            }}
          >
            BTC{' '}
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>
              {fmtUSD(b, 0)}
            </span>
          </span>
          <div
            style={{
              width: 8,
              height: 8,
              background: '#22C55E',
              borderRadius: '50%',
              animation: 'strc-blink 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* ── ATM ── */}
      <div
        className="flex flex-col items-center justify-center flex-1"
        style={{
          borderBottom: '1px solid #1E293B',
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '52px',
            fontWeight: 700,
            letterSpacing: '8px',
            color: '#FBBF24',
            marginBottom: '16px',
          }}
        >
          TODAY&apos;S ATM
        </div>
        <div
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '38px',
            fontWeight: 700,
            letterSpacing: '4px',
            padding: '8px 32px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: isActive ? '#22C55E' : '#FBBF24',
            border: isActive
              ? '1px solid rgba(34,197,94,0.4)'
              : '1px solid rgba(251,191,36,0.3)',
            background: isActive
              ? 'rgba(34,197,94,0.06)'
              : 'rgba(251,191,36,0.04)',
          }}
        >
          {isActive ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div className="flex items-baseline gap-5">
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '110px',
              fontWeight: 700,
              color: '#FBBF24',
              lineHeight: 1,
            }}
          >
            {isActive ? '' : '~'}{fmtSats(atmSats)} sats
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '72px',
              color: '#64748B',
              fontWeight: 300,
            }}
          >
            /
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '110px',
              fontWeight: 700,
              color: '#22C55E',
            }}
          >
            {fmtUSD(atmUsd, 4)}
          </span>
        </div>
        {nextLabel && (
          <div
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '26px',
              color: '#64748B',
              marginTop: '16px',
            }}
          >
            {nextLabel}
          </div>
        )}
      </div>

      {/* ── Stats Grid 4x2 ── */}
      <div
        className="grid flex-shrink-0"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: '1fr 1fr',
          borderBottom: '1px solid #1E293B',
        }}
      >
        {stats.map((st, i) => (
          <div
            key={st.l}
            className="flex flex-col justify-center items-center text-center"
            style={{
              padding: '20px 16px',
              borderRight: (i + 1) % 4 === 0 ? 'none' : '1px solid #1E293B',
              borderBottom: i < 4 ? '1px solid #1E293B' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'Fira Sans', sans-serif",
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '3px',
                textTransform: 'uppercase' as const,
                color: '#64748B',
                marginBottom: '8px',
              }}
            >
              {st.l}
            </div>
            <div
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '40px',
                fontWeight: 700,
                lineHeight: 1.2,
                color: st.gold ? '#FBBF24' : st.green ? '#22C55E' : '#F8FAFC',
              }}
            >
              {st.v}
            </div>
            {st.u && (
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '28px',
                  color: '#22C55E',
                  marginTop: '2px',
                }}
              >
                {st.u}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-end flex-shrink-0"
        style={{ padding: '0 56px', height: '24px' }}
      >
        <span
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '11px',
            color: '#64748B',
          }}
        >
          Updated {ts.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>

      {/* Blink animation */}
      <style jsx global>{`
        @keyframes strc-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </motion.div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SacaData {
  preferred: {
    ticker: string;
    name: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number | null;
    previousClose: number;
  } | null;
  btc: { price: number };
  metrics: {
    monthlyDiv: number;
    annualDiv: number;
    monthlyDivBtc: number;
    annualDivBtc: number;
    effYield: number;
    marketCap: number | null;
    sharesOutstanding: number | null;
    nextPayoutDate: string | null;
    nextRecordDate: string | null;
    companyName: string | null;
  };
  source?: string;
  lastUpdate: string;
  note?: string;
}

const fmtUSD = (n: number, d = 2) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export default function SacaSlide() {
  const [data, setData] = useState<SacaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/strc/strive', { cache: 'no-store' });
        if (!res.ok) throw new Error(`SACA API returned ${res.status}`);
        const payload: SacaData = await res.json();
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full bg-[#020617] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse tracking-wider font-mono">LOADING SACA DATA...</div>
      </div>
    );
  }

  if (!data || error || !data.preferred) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full bg-[#020617] flex items-center justify-center">
        <div className="text-red-500 text-xl font-mono">Error loading SACA data</div>
      </motion.div>
    );
  }

  const p = data.preferred;
  const up = p.priceChange >= 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="h-full w-full bg-[#020617] text-slate-100 p-10 flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-700 pb-5">
        <div>
          <div className="text-5xl font-bold tracking-[0.2em] text-amber-300">SACA</div>
          <div className="text-sm text-slate-400 mt-1">{p.ticker} · {p.name}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono">{fmtUSD(p.price)}</div>
          <div className={`text-xl font-mono ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{p.priceChange.toFixed(2)} ({up ? '+' : ''}{p.priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-center">
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">BTC</div><div className="text-2xl font-mono">{fmtUSD(data.btc.price, 0)}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Monthly Div</div><div className="text-2xl font-mono">{fmtUSD(data.metrics.monthlyDiv, 4)}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Annual Div</div><div className="text-2xl font-mono">{fmtUSD(data.metrics.annualDiv, 4)}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Yield</div><div className="text-2xl font-mono">{Number(data.metrics.effYield || 0).toFixed(2)}%</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Market Cap</div><div className="text-xl font-mono">{data.metrics.marketCap ? fmtUSD(data.metrics.marketCap, 0) : '—'}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Shares</div><div className="text-xl font-mono">{data.metrics.sharesOutstanding ? fmtInt(data.metrics.sharesOutstanding) : '—'}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Next Payout</div><div className="text-xl font-mono">{data.metrics.nextPayoutDate || '—'}</div></div>
        <div className="bg-slate-900/60 border border-slate-700 p-4"><div className="text-xs text-slate-400">Next Record</div><div className="text-xl font-mono">{data.metrics.nextRecordDate || '—'}</div></div>
      </div>

      <div className="mt-auto pt-6 text-xs text-slate-500 flex justify-between">
        <span>{data.source || 'StrategyTracker'}</span>
        <span>{new Date(data.lastUpdate).toLocaleString('en-US')}</span>
      </div>
      {data.note ? <div className="text-xs text-amber-300 mt-2">{data.note}</div> : null}
    </motion.div>
  );
}

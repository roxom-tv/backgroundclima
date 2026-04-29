'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MarketResponse, TickerData, IndexData } from './app/api/markets/live/route';

// ── Shared prefetch (deduped across instances) ────────────────────────────────

let sharedData: MarketResponse | null = null;
let fetchPromise: Promise<MarketResponse> | null = null;
const EMPTY_MARKET_DATA: MarketResponse = { tickers: [], indices: [], generatedAt: '' };

async function loadMarketData(): Promise<MarketResponse> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch('/api/markets/live')
    .then(async (r) => {
      if (!r.ok) {
        throw new Error(`Market API HTTP ${r.status}`);
      }
      return r.json() as Promise<MarketResponse>;
    })
    .then(d => { sharedData = d; fetchPromise = null; return d; })
    .catch(e => { fetchPromise = null; throw e; });
  return fetchPromise;
}

export async function prefetchMarketData(): Promise<void> {
  try { await loadMarketData(); } catch { /* silent */ }
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:       '#060707',
  surface:  '#191919',
  accent:   '#1ae784',
  accentDim:'rgba(26,231,132,0.12)',
  accentBdr:'rgba(26,231,132,0.28)',
  red:      '#FF4D4D',
  redDim:   'rgba(255,77,77,0.12)',
  redBdr:   'rgba(255,77,77,0.28)',
  text:     '#ffffff',
  text2:    'rgba(255,255,255,0.60)',
  text3:    'rgba(255,255,255,0.35)',
  border:   'rgba(255,255,255,0.08)',
  mono:     '"JetBrains Mono", "IBM Plex Mono", monospace',
  sans:     '"DM Sans", "Inter", sans-serif',
};

const FALLBACK_INDICES: IndexData[] = [
  { sym: 'spx', label: 'S&P 500', price: '—', chgPct: 0 },
  { sym: 'ixic', label: 'Nasdaq', price: '—', chgPct: 0 },
  { sym: 'dji', label: 'Dow Jones', price: '—', chgPct: 0 },
  { sym: 'vix', label: 'VIX', price: '—', chgPct: 0 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function IndexItem({ idx }: { idx: IndexData }) {
  const up = idx.chgPct >= 0;
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:12, flexShrink:0 }}>
      <span style={{ fontSize:16, fontWeight:700, letterSpacing:'0.12em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans }}>
        {idx.label}
      </span>
      <span style={{ fontSize:19, fontWeight:800, letterSpacing:'-0.02em', fontFamily:T.mono }}>
        {idx.price}
      </span>
      <span style={{
        fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:9999,
        background: up ? T.accentDim : T.redDim,
        color: up ? T.accent : T.red,
      }}>
        {up ? '▲' : '▼'} {Math.abs(idx.chgPct).toFixed(2)}%
      </span>
    </div>
  );
}

function StockCard({ t }: { t: TickerData }) {
  const up = t.chgPct >= 0;
  const hasVolPct = t.volPct !== null;
  const volW = hasVolPct ? Math.min(t.volPct!, 100) : 0;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${t.badges.includes('52h') ? T.accentBdr : T.border}`,
      borderRadius: 12,
      padding: '32px 36px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Green top bar for high priority */}
      {t.badges.length >= 2 && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
        }} />
      )}

      {/* Header: logo + symbol + badges */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.logoUrl}
            alt={t.sym}
            width={57} height={57}
            style={{ borderRadius:10, objectFit:'contain', background:'rgba(255,255,255,0.06)', padding:6, flexShrink:0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.01em', lineHeight:1 }}>
            {t.sym}
          </span>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {t.badges.includes('52h') && (
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'0.07em', textTransform:'uppercase', padding:'4px 12px', borderRadius:9999, background:T.accentDim, color:T.accent, border:`1px solid ${T.accentBdr}` }}>
              52W HIGH
            </span>
          )}
        </div>
      </div>

      {/* Price + change */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:0, marginBottom:28 }}>
        <span style={{ fontSize:72, fontWeight:900, letterSpacing:'-0.03em', fontFamily:T.mono, lineHeight:1 }}>
          ${t.price.toFixed(2)}
        </span>
        <span style={{
          fontSize:28, fontWeight:700, padding:'6px 14px', borderRadius:9999, marginTop:20,
          background: up ? T.accentDim : T.redDim,
          color: up ? T.accent : T.red,
        }}>
          {up ? '▲ +' : '▼ '}{t.chgPct.toFixed(2)}%&nbsp;&nbsp;{up ? '+' : '−'}${Math.abs(t.chg).toFixed(2)}
        </span>
      </div>

      {/* Tier 1: Volume + 52W Position */}
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:20, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:48 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:'0.1em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans, marginBottom:8 }}>Volume</div>
            <div style={{ fontSize:33, fontWeight:700, fontFamily:T.mono, color: T.text }}>{t.vol}</div>
          </div>
          <div style={{ marginLeft:40 }}>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:'0.1em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans, marginBottom:8, whiteSpace:'nowrap' }}>52W Position</div>
            <div style={{ fontSize:33, fontWeight:700, fontFamily:T.mono, color: t.w52Pos >= 99 ? T.accent : t.w52Pos < 20 ? T.red : T.text }}>
              {t.w52Pos >= 99 ? 'NEW HIGH' : `${t.w52Pos}%`}
            </div>
          </div>
        </div>

        {/* Day Range inline */}
        <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:15, whiteSpace:'nowrap' }}>
          <span style={{ fontSize:16, fontWeight:800, letterSpacing:'0.1em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans }}>Day Range</span>
          <span style={{ fontSize:22, fontWeight:700, fontFamily:T.mono }}>{t.dayRange}</span>
        </div>

        {/* Vol vs Avg bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
          <span style={{ fontSize:16, fontWeight:800, letterSpacing:'0.1em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans, flexShrink:0, width:120 }}>Vol vs Avg</span>
          <div style={{ flex:1, height:5, background:T.border, borderRadius:9999, overflow:'hidden' }}>
            <div style={{ width:`${volW}%`, height:'100%', borderRadius:9999, background: up ? T.accent : T.red }} />
          </div>
          <span style={{ fontSize:24, fontWeight:700, fontFamily:T.mono, flexShrink:0, width:80, textAlign:'right', marginRight:5, color: up ? T.accent : T.red }}>
            {hasVolPct ? `${t.volPct}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Mkt Cap */}
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:20 }}>
        <div style={{ fontSize:16, fontWeight:800, letterSpacing:'0.1em', color:T.text3, textTransform:'uppercase', fontFamily:T.sans, marginBottom:8 }}>Mkt Cap</div>
        <div style={{ fontSize:26, fontWeight:700, fontFamily:T.mono }}>{t.mktCap}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DESIGN_W = 1920;
const DESIGN_H = 1080;

export default function MarketSlide() {
  const [data, setData]         = useState<MarketResponse | null>(sharedData);
  const [isLoading, setIsLoading] = useState<boolean>(!sharedData);
  const [stockPage, setStockPage] = useState(0);
  const [idxPage,   setIdxPage]   = useState(0);
  const [scale,     setScale]     = useState(1);
  const stockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataTimer  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scale 1920×1080 canvas to fit inside the viewport (contain), centered.
  // The outer div (position:absolute; inset:0; background:T.bg) covers any remaining gaps.
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Initial load + 60s refresh
  useEffect(() => {
    if (!data) {
      loadMarketData()
        .then((payload) => {
          setData(payload);
          setIsLoading(false);
        })
        .catch(() => {
          // Keep slide stable if API is temporarily unavailable.
          setData(sharedData ?? EMPTY_MARKET_DATA);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    dataTimer.current = setInterval(() => {
      loadMarketData()
        .then(setData)
        .catch(() => {
          // Preserve previous payload and avoid noisy runtime errors in rotation.
          setData((prev) => prev ?? sharedData ?? EMPTY_MARKET_DATA);
        });
    }, 15_000);

    return () => {
      if (dataTimer.current) clearInterval(dataTimer.current);
    };
  }, []);

  // Stock page rotation every 8s
  useEffect(() => {
    stockTimer.current = setInterval(() => setStockPage(p => 1 - p), 8_000);
    return () => { if (stockTimer.current) clearInterval(stockTimer.current); };
  }, []);

  // Index page rotation every 6s
  useEffect(() => {
    idxTimer.current = setInterval(() => setIdxPage(p => 1 - p), 6_000);
    return () => { if (idxTimer.current) clearInterval(idxTimer.current); };
  }, []);

  const tickers = data?.tickers ?? [];
  const page1   = tickers.slice(0, 3);
  const page2   = tickers.slice(3, 6);
  const idxP1   = (data?.indices ?? []).slice(0, 4);
  const idxP2   = (data?.indices ?? []).slice(4, 8);
  const currentIdx = (idxPage === 0 ? idxP1 : idxP2).length > 0 ? (idxPage === 0 ? idxP1 : idxP2) : FALLBACK_INDICES;
  const hasAnyData = tickers.length > 0 || (data?.indices?.length ?? 0) > 0;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: T.bg, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Fixed 1920×1080 canvas — scales uniformly, centered, dark bg fills any gap */}
      <div style={{
        width: DESIGN_W, height: DESIGN_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        color: T.text,
        fontFamily: T.sans,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Ambient glow */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        background:`radial-gradient(ellipse at 15% 0%, rgba(26,231,132,.08) 0%, transparent 50%),
                    radial-gradient(ellipse at 85% 100%, rgba(26,231,132,.05) 0%, transparent 50%)`,
      }} />

      {/* HEADER */}
      <header style={{
        position:'relative', zIndex:10, flexShrink:0, height:68,
        borderBottom:`1px solid ${T.border}`,
        display:'flex', alignItems:'center', padding:'0 40px',
        background:'rgba(6,7,7,0.96)',
        backdropFilter:'blur(20px)',
      }}>
        {/* Logo */}
        <div style={{ flexShrink:0, marginRight:48, display:'flex', alignItems:'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rtvwhite.png" alt="Roxom TV" style={{ height:38, width:'auto', display:'block' }} />
        </div>

        {/* Indices — animated slide */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', height:'100%', display:'flex', alignItems:'center' }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={idxPage}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0,      opacity: 1 }}
              exit={{    x: '-100%', opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              style={{ display:'flex', alignItems:'center', gap:36, width:'100%' }}
            >
              {currentIdx.map(idx => <IndexItem key={idx.sym} idx={idx} />)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live badge */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:20, marginLeft:'auto' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:7,
            background:'rgba(231,0,11,0.12)', border:'1px solid rgba(231,0,11,0.35)',
            padding:'5px 14px', borderRadius:9999,
            fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#ff4444',
          }}>
            <LiveDot />
            LIVE
          </div>
        </div>
      </header>

      {/* MAIN — stock pages */}
      <main style={{ position:'relative', zIndex:1, flex:1, minHeight:0 }}>
        {!isLoading && !hasAnyData ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.text2,
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            MARKET DATA UNAVAILABLE
          </div>
        ) : isLoading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.text2,
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            LOADING MARKET DATA...
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={stockPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'absolute', inset: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gridTemplateRows: '1fr',
                gap: 16, padding: '16px 40px',
              }}
            >
              {(stockPage === 0 ? page1 : page2).map(t => (
                <StockCard key={t.sym} t={t} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Minimal footer */}
      <footer style={{
        position:'relative', zIndex:10, flexShrink:0, height:40,
        borderTop:`1px solid ${T.border}`,
        background:'rgba(6,7,7,0.96)',
      }} />
      </div>{/* end scaled canvas */}
    </div>
  );
}

// ── Live dot animation ────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <motion.div
      style={{ width:7, height:7, borderRadius:'50%', background:'#e7000b', flexShrink:0 }}
      animate={{ boxShadow: ['0 0 0 0 rgba(231,0,11,0.7)', '0 0 0 5px rgba(231,0,11,0)', '0 0 0 0 rgba(231,0,11,0.7)'] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

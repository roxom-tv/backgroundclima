import { NextResponse } from 'next/server';
import { getBTCPriceWithCache } from '@/lib/btc-cache';

const TICKER   = process.env.SATA_TICKER ?? 'SATA';
const PAR      = 100; // $100 par value preferred
const YF_HDR   = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' };
const CACHE_MS = 60_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DivRaw { amount: number; date: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ChartResult {
  price: number; prevClose: number; vol: number;
  mktCap: number | null; avgVol: number | null;
  w52h: number | null; w52l: number | null;
  name: string;
  dividends: DivRaw[];
}

async function fetchChart(sym: string): Promise<ChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1y&events=dividends`;
  const r = await fetch(url, { headers: YF_HDR, cache: 'no-store' });
  if (!r.ok) throw new Error(`${sym} chart HTTP ${r.status}`);
  const j = await r.json();
  const result = j.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${sym}`);
  const m = result.meta;
  const divs: DivRaw[] = (Object.values(result.events?.dividends ?? {}) as DivRaw[])
    .sort((a, b) => a.date - b.date);
  return {
    price:     m.regularMarketPrice ?? 0,
    prevClose: m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice ?? 0,
    vol:       m.regularMarketVolume ?? 0,
    mktCap:    m.marketCap ?? null,
    avgVol:    m.averageVolume ?? m.averageDailyVolume3Month ?? null,
    w52h:      m.fiftyTwoWeekHigh  ?? null,
    w52l:      m.fiftyTwoWeekLow   ?? null,
    name:      m.shortName ?? m.longName ?? sym,
    dividends: divs,
  };
}

interface QuoteResult {
  sharesOutstanding: number | null; mktCap: number | null;
  avgVol: number | null; exDivDate: number | null;
  divDate: number | null;
}

async function fetchQuote(sym: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const r = await fetch(url, { headers: YF_HDR, cache: 'no-store' });
  if (!r.ok) return { sharesOutstanding: null, mktCap: null, avgVol: null, exDivDate: null, divDate: null };
  const row = ((await r.json())?.quoteResponse?.result ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return { sharesOutstanding: null, mktCap: null, avgVol: null, exDivDate: null, divDate: null };
  return {
    sharesOutstanding: typeof row.sharesOutstanding         === 'number' ? row.sharesOutstanding         : null,
    mktCap:            typeof row.marketCap                 === 'number' ? row.marketCap                 : null,
    avgVol:            typeof row.averageDailyVolume3Month  === 'number' ? row.averageDailyVolume3Month  : null,
    exDivDate:         typeof row.exDividendDate            === 'number' ? row.exDividendDate            : null,
    divDate:           typeof row.dividendDate              === 'number' ? row.dividendDate              : null,
  };
}

function tsISO(ts: number) { return new Date(ts * 1000).toISOString().slice(0, 10); }
function addDays(iso: string, n: number) {
  const d = new Date(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry { data: unknown; ts: number }
let _cache: CacheEntry | null = null;

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_MS) {
    return NextResponse.json(_cache.data, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const [btcPrice, chart, quote] = await Promise.all([
      getBTCPriceWithCache(),
      fetchChart(TICKER),
      fetchQuote(TICKER).catch(() => ({ sharesOutstanding: null, mktCap: null, avgVol: null, exDivDate: null, divDate: null } as QuoteResult)),
    ]);

    const price      = chart.price;
    const prevClose  = chart.prevClose;
    const priceChange    = parseFloat((price - prevClose).toFixed(4));
    const priceChangePct = prevClose ? parseFloat(((priceChange / prevClose) * 100).toFixed(4)) : 0;

    const divArr     = chart.dividends;
    const monthlyDiv = divArr.length > 0 ? divArr[divArr.length - 1].amount : 0;
    const annualDiv  = parseFloat((monthlyDiv * 12).toFixed(4));
    const effYield   = price > 0 ? parseFloat(((annualDiv / price) * 100).toFixed(4)) : 0;
    const monthlyDivBtc = btcPrice > 0 ? monthlyDiv / btcPrice : 0;
    const annualDivBtc  = btcPrice > 0 ? annualDiv  / btcPrice : 0;

    const mktCap           = quote.mktCap  ?? chart.mktCap   ?? null;
    const sharesOutstanding = quote.sharesOutstanding ?? null;
    const avgVolume30D      = quote.avgVol ?? chart.avgVol ?? null;

    const nextPayoutDate = quote.divDate   ? tsISO(quote.divDate)   : quote.exDivDate ? addDays(tsISO(quote.exDivDate), 14) : null;
    const nextRecordDate = quote.exDivDate ? addDays(tsISO(quote.exDivDate), 1) : null;

    const body = {
      preferred: {
        ticker:              TICKER,
        name:                chart.name,
        price,
        priceChange,
        priceChangePercent:  priceChangePct,
        volume:              chart.vol > 0 ? chart.vol : null,
        previousClose:       prevClose,
      },
      btc: { price: btcPrice },
      metrics: {
        monthlyDiv, annualDiv, monthlyDivBtc, annualDivBtc, effYield,
        marketCap:         mktCap,
        sharesOutstanding,
        nextPayoutDate,
        nextRecordDate,
        companyName:       chart.name,
        yearHigh:          chart.w52h,
        yearLow:           chart.w52l,
        avgVolume30D,
      },
      source: 'yahoo-finance',
      lastUpdate: new Date().toISOString(),
    };

    _cache = { data: body, ts: Date.now() };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err) {
    console.error('[strc/strive]', err);
    if (_cache) return NextResponse.json(_cache.data, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Failed to fetch SATA data' }, { status: 503 });
  }
}

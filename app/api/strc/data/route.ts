import { NextResponse } from 'next/server';
import { getBTCPriceWithCache } from '@/lib/btc-cache';

const TICKER   = process.env.STRC_TICKER  ?? 'STRC';
const PAR      = 100; // $100 par value preferred
const YF_HDR   = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' };
const CACHE_MS = 60_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DivRaw { amount: number; date: number }

interface ChartResult {
  price: number; prevClose: number; vol: number;
  mktCap: number | null; avgVol: number | null;
  w52h: number | null; w52l: number | null;
  dividends: DivRaw[];
}

interface QuoteResult {
  sharesOutstanding: number | null; mktCap: number | null;
  avgVol: number | null; exDivDate: number | null;
  divDate: number | null; price: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    price:    m.regularMarketPrice ?? 0,
    prevClose: m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice ?? 0,
    vol:      m.regularMarketVolume ?? 0,
    mktCap:   m.marketCap ?? null,
    avgVol:   m.averageVolume ?? m.averageDailyVolume3Month ?? null,
    w52h:     m.fiftyTwoWeekHigh ?? null,
    w52l:     m.fiftyTwoWeekLow ?? null,
    dividends: divs,
  };
}

async function fetchQuote(syms: string[]): Promise<Record<string, QuoteResult>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms.join(','))}`;
  const r = await fetch(url, { headers: YF_HDR, cache: 'no-store' });
  if (!r.ok) return {};
  const rows = ((await r.json())?.quoteResponse?.result ?? []) as Array<Record<string, unknown>>;
  const out: Record<string, QuoteResult> = {};
  for (const row of rows) {
    const s = String(row.symbol ?? '');
    if (!s) continue;
    out[s] = {
      sharesOutstanding: typeof row.sharesOutstanding === 'number' ? row.sharesOutstanding : null,
      mktCap:   typeof row.marketCap               === 'number' ? row.marketCap               : null,
      avgVol:   typeof row.averageDailyVolume3Month === 'number' ? row.averageDailyVolume3Month : null,
      exDivDate: typeof row.exDividendDate          === 'number' ? row.exDividendDate           : null,
      divDate:   typeof row.dividendDate            === 'number' ? row.dividendDate             : null,
      price:    typeof row.regularMarketPrice       === 'number' ? row.regularMarketPrice       : null,
    };
  }
  return out;
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
    const [btcPrice, chart, quotes] = await Promise.all([
      getBTCPriceWithCache(),
      fetchChart(TICKER),
      fetchQuote([TICKER, 'MSTR']).catch(() => ({} as Record<string, QuoteResult>)),
    ]);

    const q    = quotes[TICKER]  ?? {} as QuoteResult;
    const mstr = quotes['MSTR']  ?? {} as QuoteResult;

    const price      = chart.price;
    const prevClose  = chart.prevClose;
    const priceChange    = parseFloat((price - prevClose).toFixed(4));
    const priceChangePct = prevClose ? parseFloat(((priceChange / prevClose) * 100).toFixed(4)) : 0;

    const divArr    = chart.dividends;
    const monthlyDiv = divArr.length > 0 ? divArr[divArr.length - 1].amount : 0;
    const annualDiv  = parseFloat((monthlyDiv * 12).toFixed(4));
    const annualRate = parseFloat(((annualDiv / PAR) * 100).toFixed(4));
    const effYield   = price > 0 ? parseFloat(((annualDiv / price) * 100).toFixed(4)) : 0;
    const monthlyDivBtc = btcPrice > 0 ? monthlyDiv / btcPrice : 0;
    const annualDivBtc  = btcPrice > 0 ? annualDiv  / btcPrice : 0;

    const mktCap          = q.mktCap ?? chart.mktCap ?? 0;
    const sharesOutstanding = q.sharesOutstanding ?? 0;

    const nextPayoutDate = q.divDate    ? tsISO(q.divDate)    : q.exDivDate ? addDays(tsISO(q.exDivDate), 14) : '';
    const nextRecordDate = q.exDivDate  ? addDays(tsISO(q.exDivDate), 1) : '';

    const dividends = divArr.slice(-12).map(d => {
      const exIso     = tsISO(d.date);
      const payDate   = addDays(exIso, 14);
      const recDate   = addDays(exIso, 1);
      const rate      = parseFloat(((d.amount * 12 / PAR) * 100).toFixed(4));
      const period    = new Date(d.date * 1000).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { period, recordDate: recDate, payDate, usd: d.amount, rate, btc: btcPrice > 0 ? d.amount / btcPrice : 0 };
    });

    const body = {
      strc: { price, previousClose: prevClose, priceChange, priceChangePercent: priceChangePct, negative: priceChange < 0, volume: chart.vol },
      btc:  { price: btcPrice },
      dividends,
      metrics: {
        parValue: PAR, annualDiv, annualRate, monthlyDiv,
        monthlyDivBtc, annualDivBtc, effYield,
        marketCap: mktCap, sharesOutstanding,
        nextPayoutDate, nextRecordDate,
        mstrPrice: mstr.price ?? undefined,
      },
      lastUpdate: new Date().toISOString(),
    };

    _cache = { data: body, ts: Date.now() };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err) {
    console.error('[strc/data]', err);
    if (_cache) return NextResponse.json(_cache.data, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Failed to fetch STRC data' }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TickerData {
  sym: string;
  price: number;
  chg: number;
  chgPct: number;
  dayRange: string;
  vol: string;
  volPct: number | null;
  w52Low: number | null;
  w52High: number | null;
  w52Pos: number;
  mktCap: string;
  pe: string;
  eps: string;
  beta: string;
  badges: string[];
  logoUrl: string;
}

export interface IndexData {
  sym: string;
  label: string;
  price: string;
  chgPct: number;
}

export interface MarketResponse {
  tickers: TickerData[];
  indices: IndexData[];
  generatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WATCHLIST = [
  'NVDA','AAPL','MSFT','AMZN','GOOGL','META','TSLA','AVGO','AMD','ORCL',
  'JPM','BAC','GS','MS','V','MA','BRK-B','BX',
  'UNH','JNJ','LLY','PFE','WMT','COST','HD','MCD',
  'XOM','CVX','CAT','HON','GE','BA',
  'ARM','SMCI','CRM','NOW','PLTR','UBER','NFLX','COIN',
];

const INDEX_POOL = [
  { sym: '^GSPC',    label: 'S&P 500'    },
  { sym: '^IXIC',    label: 'Nasdaq'     },
  { sym: '^DJI',     label: 'Dow Jones'  },
  { sym: '^RUT',     label: 'Russell'    },
  { sym: '^VIX',     label: 'VIX'        },
  { sym: '^TNX',     label: '10Y Yield'  },
  { sym: 'GC=F',     label: 'Gold'       },
  { sym: 'CL=F',     label: 'WTI Oil'    },
  { sym: 'DX-Y.NYB', label: 'DXY'        },
];

const LOGO_TOKEN = process.env.LOGO_TOKEN ?? '';
const SUMMARY_TTL = 30 * 60 * 1000; // 30 min
const SUMMARY_SYMBOL_LIMIT = 6; // only enrich symbols we actually display

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

// ── Module-level cache (per server instance) ─────────────────────────────────

let _crumb: string | null = null;
let _cookie: string | null = null;
let summaryCache: { ts: number; data: Record<string, SummaryRaw> } | null = null;
const metricCache: Record<string, { pe: number | null; eps: number | null; beta: number | null; avgVol: number | null; mktCap: number | null; ts: number }> = {};
const avgVolCache: Record<string, { val: number | null; ts: number }> = {};
const AVGVOL_TTL = 30 * 60 * 1000;

// ── Yahoo Finance helpers ────────────────────────────────────────────────────

interface ChartRaw {
  sym: string;
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  vol: number;
  w52Low: number | null;
  w52High: number | null;
  mktCap: number | null;
  avgVol: number | null;
}

async function fetchChart(symbol: string): Promise<ChartRaw> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;
  const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`${symbol} chart HTTP ${res.status}`);
  const json = await res.json();
  const meta = json.chart.result[0].meta;
  return {
    sym:       symbol,
    price:     meta.regularMarketPrice ?? 0,
    prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    dayHigh:   meta.regularMarketDayHigh ?? 0,
    dayLow:    meta.regularMarketDayLow ?? 0,
    vol:       meta.regularMarketVolume ?? 0,
    w52Low:    meta.fiftyTwoWeekLow ?? null,
    w52High:   meta.fiftyTwoWeekHigh ?? null,
    mktCap:    meta.marketCap ?? null,
    avgVol:    meta.averageVolume ?? meta.averageDailyVolume3Month ?? null,
  };
}

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (_crumb && _cookie) return { crumb: _crumb, cookie: _cookie };
  const r1 = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': YF_HEADERS['User-Agent'] },
    cache: 'no-store',
  });
  _cookie = (r1.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': YF_HEADERS['User-Agent'], Cookie: _cookie },
    cache: 'no-store',
  });
  if (!r2.ok) throw new Error(`crumb HTTP ${r2.status}`);
  _crumb = await r2.text();
  return { crumb: _crumb, cookie: _cookie };
}

interface SummaryRaw {
  pe: number | null;
  eps: number | null;
  beta: number | null;
  avgVol: number | null;
  mktCap: number | null;
}

interface QuoteRaw {
  pe: number | null;
  eps: number | null;
  beta: number | null;
  avgVol: number | null;
  mktCap: number | null;
}

async function fetchQuotesBatch(symbols: string[]): Promise<Record<string, QuoteRaw>> {
  if (symbols.length === 0) return {};
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`quote batch HTTP ${res.status}`);
  const json = await res.json();
  const rows = (json?.quoteResponse?.result ?? []) as Array<Record<string, unknown>>;

  const out: Record<string, QuoteRaw> = {};
  for (const row of rows) {
    const symbol = String(row.symbol ?? '');
    if (!symbol) continue;
    out[symbol] = {
      pe: typeof row.trailingPE === 'number' ? row.trailingPE : null,
      eps: typeof row.epsTrailingTwelveMonths === 'number' ? row.epsTrailingTwelveMonths : null,
      beta: typeof row.beta === 'number' ? row.beta : null,
      avgVol: typeof row.averageDailyVolume3Month === 'number'
        ? row.averageDailyVolume3Month
        : (typeof row.averageDailyVolume10Day === 'number' ? row.averageDailyVolume10Day : null),
      mktCap: typeof row.marketCap === 'number' ? row.marketCap : null,
    };
  }
  return out;
}

async function fetchSummary(symbol: string): Promise<SummaryRaw> {
  const { crumb, cookie } = await getYahooCrumb();
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: { ...YF_HEADERS, Cookie: cookie },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${symbol} summary HTTP ${res.status}`);
  const json = await res.json();
  const r = json.quoteSummary?.result?.[0];
  if (!r) return { pe: null, eps: null, beta: null, avgVol: null, mktCap: null };
  const sd = r.summaryDetail ?? {};
  const ks = r.defaultKeyStatistics ?? {};
  return {
    pe:     sd.trailingPE?.raw  ?? ks.trailingPE?.raw  ?? null,
    eps:    ks.trailingEps?.raw ?? null,
    beta:   sd.beta?.raw        ?? null,
    avgVol: sd.averageVolume?.raw ?? null,
    mktCap: sd.marketCap?.raw   ?? null,
  };
}

// ── Avg volume from 3-month chart (fallback when quote/meta fields are empty) ─

async function fetchAvgVol3Mo(symbol: string): Promise<number | null> {
  const cached = avgVolCache[symbol];
  if (cached && Date.now() - cached.ts < AVGVOL_TTL) return cached.val;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
    const res = await fetch(url, { headers: YF_HEADERS, cache: 'no-store' });
    if (!res.ok) throw new Error(`avgvol HTTP ${res.status}`);
    const json = await res.json();
    const vols: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume ?? [];
    const valid = vols.filter((v): v is number => typeof v === 'number' && v > 0);
    const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
    avgVolCache[symbol] = { val: avg, ts: Date.now() };
    return avg;
  } catch {
    avgVolCache[symbol] = { val: null, ts: Date.now() };
    return null;
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

function hasCompleteSummary(summary?: SummaryRaw): boolean {
  if (!summary) return false;
  return summary.pe !== null
    && summary.eps !== null
    && summary.beta !== null
    && summary.avgVol !== null
    && summary.mktCap !== null;
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtMktCap(v: number | null): string {
  if (!v) return '—';
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9)  return (v / 1e9).toFixed(1)  + 'B';
  return (v / 1e6).toFixed(0) + 'M';
}

function fmtVol(v: number): string {
  if (!v) return '—';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Fetch all charts in parallel
    const chartResults = await Promise.allSettled(
      WATCHLIST.map(sym => withRetry(() => fetchChart(sym)))
    );
    const charts: Record<string, ChartRaw> = {};
    WATCHLIST.forEach((sym, i) => {
      if (chartResults[i].status === 'fulfilled') charts[sym] = (chartResults[i] as PromiseFulfilledResult<ChartRaw>).value;
    });

    if (Object.keys(charts).length < 3) {
      return NextResponse.json({ error: 'Insufficient chart data' }, { status: 503 });
    }

    // 2. Fetch indices in parallel
    const idxResults = await Promise.allSettled(
      INDEX_POOL.map(({ sym }) => withRetry(() => fetchChart(sym)))
    );
    const idxRaw: Record<string, ChartRaw> = {};
    INDEX_POOL.forEach(({ sym }, i) => {
      if (idxResults[i].status === 'fulfilled') idxRaw[sym] = (idxResults[i] as PromiseFulfilledResult<ChartRaw>).value;
    });

    // 3. Fetch quote stats in one batch (faster + more complete for top-line fields).
    let quoteStats: Record<string, QuoteRaw> = {};
    try {
      quoteStats = await withRetry(() => fetchQuotesBatch(WATCHLIST), 2, 500);
    } catch {
      quoteStats = {};
    }

    // 4. Summaries — enrich only symbols likely to be shown (top movers),
    // with 30-min cache for fast subsequent responses.
    const now = Date.now();
    const staleCache = summaryCache?.data ?? {};
    const provisionalTopSymbols = WATCHLIST
      .filter((sym) => charts[sym])
      .map((sym) => {
        const c = charts[sym];
        const price = c.price;
        const prev = c.prevClose || price;
        const chgPct = prev ? ((price - prev) / prev) * 100 : 0;
        const avgVol = c.avgVol ?? null;
        const volPct = avgVol ? Math.round((c.vol / avgVol) * 100) : 0;
        return { sym, chgPct, volPct };
      })
      .sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct) || b.volPct - a.volPct)
      .slice(0, SUMMARY_SYMBOL_LIMIT)
      .map((row) => row.sym);

    let summaries: Record<string, SummaryRaw> = staleCache;
    const shouldRefreshSummaries = !summaryCache || (now - summaryCache.ts) >= SUMMARY_TTL;
    const missingOrIncompleteSymbols = provisionalTopSymbols.filter((sym) => !hasCompleteSummary(staleCache[sym]));
    const symbolsToRefresh = shouldRefreshSummaries
      ? provisionalTopSymbols
      : missingOrIncompleteSymbols;

    if (symbolsToRefresh.length > 0) {
      const nextSummaries: Record<string, SummaryRaw> = { ...staleCache };
      for (const sym of symbolsToRefresh) {
        try {
          // Yahoo often rate-limits parallel summary calls; do gentle sequential fetches.
          nextSummaries[sym] = await withRetry(() => fetchSummary(sym), 2, 700);
        } catch {
          nextSummaries[sym] = nextSummaries[sym] ?? {
            pe: null, eps: null, beta: null, avgVol: null, mktCap: null,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 140));
      }

      summaries = nextSummaries;
      summaryCache = { ts: now, data: nextSummaries };
    }

    // 5. Merge & derive
    const allRankedTickers = WATCHLIST
      .filter(sym => charts[sym])
      .map(sym => {
        const c = charts[sym];
        const q = quoteStats[sym] ?? {};
        const s = summaries[sym] ?? {};
        const cached = metricCache[sym];
        const price  = c.price;
        const prev   = c.prevClose || price;
        const chg    = parseFloat((price - prev).toFixed(2));
        const chgPct = prev ? parseFloat(((chg / prev) * 100).toFixed(2)) : 0;
        const avgVol   = q.avgVol ?? c.avgVol ?? s.avgVol ?? cached?.avgVol ?? null;
        const mktCapRaw = q.mktCap ?? s.mktCap ?? c.mktCap ?? cached?.mktCap ?? null;
        const peRaw = q.pe ?? s.pe ?? cached?.pe ?? null;
        const epsRaw = q.eps ?? s.eps ?? cached?.eps ?? null;
        const betaRaw = q.beta ?? s.beta ?? cached?.beta ?? null;
        const volPct   = avgVol ? Math.round((c.vol / avgVol) * 100) : null;
        const w52Pos   = (c.w52Low && c.w52High && c.w52High > c.w52Low)
          ? Math.min(100, Math.round(((price - c.w52Low) / (c.w52High - c.w52Low)) * 100))
          : 50;

        // Persist last known valid metrics so transient nulls don't show placeholders.
        metricCache[sym] = {
          pe: peRaw,
          eps: epsRaw,
          beta: betaRaw,
          avgVol,
          mktCap: mktCapRaw,
          ts: now,
        };

        const badges: string[] = [];
        if (Math.abs(chgPct) >= 3) badges.push('move');
        if (volPct !== null && volPct >= 150) badges.push('vol');
        if (w52Pos >= 99) badges.push('52h');

        return {
          sym,
          price,
          chg,
          chgPct,
          dayRange: `$${c.dayLow.toFixed(2)} – $${c.dayHigh.toFixed(2)}`,
          vol:      fmtVol(c.vol),
          volPct,
          w52Low:   c.w52Low,
          w52High:  c.w52High,
          w52Pos,
          mktCap:   fmtMktCap(mktCapRaw),
          pe:       peRaw !== null ? peRaw.toFixed(1) + '×' : 'N/A',
          eps:      epsRaw !== null ? '$' + epsRaw.toFixed(2) : 'N/A',
          beta:     betaRaw !== null ? betaRaw.toFixed(2) : 'N/A',
          badges,
          logoUrl:  `https://img.logo.dev/ticker/${sym.toLowerCase()}${LOGO_TOKEN ? '?token=' + LOGO_TOKEN : ''}`,
          _isComplete: avgVol !== null && mktCapRaw !== null && peRaw !== null && epsRaw !== null && betaRaw !== null,
        };
      });

    // Prioritize symbols with full metric coverage; then rank by move.
    allRankedTickers.sort((a, b) => {
      const byMove = Math.abs(b.chgPct) - Math.abs(a.chgPct);
      if (byMove !== 0) return byMove;
      const aVol = a.volPct ?? -1;
      const bVol = b.volPct ?? -1;
      return bVol - aVol;
    });
    const complete = allRankedTickers.filter((t) => t._isComplete);
    const incomplete = allRankedTickers.filter((t) => !t._isComplete);
    const top6 = [...complete, ...incomplete].slice(0, 6).map((ticker) => ({
      sym: ticker.sym,
      price: ticker.price,
      chg: ticker.chg,
      chgPct: ticker.chgPct,
      dayRange: ticker.dayRange,
      vol: ticker.vol,
      volPct: ticker.volPct,
      w52Low: ticker.w52Low,
      w52High: ticker.w52High,
      w52Pos: ticker.w52Pos,
      mktCap: ticker.mktCap,
      pe: ticker.pe,
      eps: ticker.eps,
      beta: ticker.beta,
      badges: ticker.badges,
      logoUrl: ticker.logoUrl,
    }));

    // 5.5. For the displayed symbols missing avgVol, fetch from 3-month chart.
    // Only runs for symbols actually shown (max 6), and only when cache misses.
    const needAvgVol = top6.filter(t => t.volPct === null);
    if (needAvgVol.length > 0) {
      try {
        const avgVolResults = await Promise.allSettled(
          needAvgVol.map(t => fetchAvgVol3Mo(t.sym))
        );
        needAvgVol.forEach((t, i) => {
          const r = avgVolResults[i];
          if (r.status === 'fulfilled' && r.value !== null) {
            const c = charts[t.sym];
            if (c) {
              t.volPct = Math.round((c.vol / r.value) * 100);
              if (metricCache[t.sym]) metricCache[t.sym].avgVol = r.value;
            }
          }
        });
      } catch { /* non-critical — volPct stays null if this fails */ }
    }

    // 6. Top 8 indices by abs % change
    const indices: IndexData[] = INDEX_POOL
      .filter(i => idxRaw[i.sym])
      .map(({ sym, label }) => {
        const d = idxRaw[sym];
        const prev = d.prevClose || d.price;
        const chgPct = prev ? ((d.price - prev) / prev) * 100 : 0;
        const val = sym === '^TNX'
          ? d.price.toFixed(2) + '%'
          : d.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        return { sym, label, price: val, chgPct };
      })
      .sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct))
      .slice(0, 8);

    const body: MarketResponse = {
      tickers: top6,
      indices,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (err) {
    console.error('[markets/live]', err);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}

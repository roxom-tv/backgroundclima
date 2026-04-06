import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATA_BASE = 'https://data.strategytracker.com';
const TICKER = 'ASST';

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

export async function GET() {
  try {
    const latest = await fetchJson(`${DATA_BASE}/latest.json`);
    const version = latest?.version;
    if (!version) {
      return NextResponse.json({ error: 'Missing version from StrategyTracker' }, { status: 502 });
    }

    const full = await fetchJson(`${DATA_BASE}/${TICKER}.v${version}.json`);
    const pm = full?.companies?.[TICKER]?.processedMetrics;
    if (!pm) {
      return NextResponse.json({ error: 'Missing ASST processedMetrics' }, { status: 502 });
    }

    const btcPrice = Number(pm.btcPrice);
    if (!Number.isFinite(btcPrice) || btcPrice <= 0) {
      return NextResponse.json({ error: 'Invalid btcPrice in ASST payload' }, { status: 502 });
    }

    const pref = Array.isArray(pm.preferredStocks) && pm.preferredStocks.length > 0
      ? pm.preferredStocks[0]
      : null;

    if (!pref) {
      return NextResponse.json({
        preferred: null,
        btc: { price: btcPrice },
        metrics: {
          monthlyDiv: 0,
          annualDiv: 0,
          monthlyDivBtc: 0,
          annualDivBtc: 0,
          effYield: 0,
          marketCap: null,
          sharesOutstanding: null,
          nextPayoutDate: null,
          nextRecordDate: null,
          companyName: pm.companyName ?? null,
        },
        source: `${DATA_BASE} (${TICKER})`,
        note: 'No preferredStocks in payload',
        lastUpdate: full?.timestamp || new Date().toISOString(),
      });
    }

    const monthlyDiv = pref.latestDividend != null ? Number(pref.latestDividend) : Number(pref.dividendRate) / 12;
    const annualDiv = Number(pref.dividendRate);

    return NextResponse.json({
      preferred: {
        ticker: pref.ticker,
        name: pref.name,
        price: Number(pref.price),
        priceChange: Number(pref.priceChange),
        priceChangePercent: Number(pref.priceChangePercent),
        volume: pref.volume ?? null,
        previousClose: Number(pref.previousClose),
      },
      btc: { price: btcPrice },
      metrics: {
        monthlyDiv,
        annualDiv,
        monthlyDivBtc: monthlyDiv / btcPrice,
        annualDivBtc: annualDiv / btcPrice,
        effYield: Number(pref.effectiveYield),
        marketCap: pref.marketCap ?? null,
        sharesOutstanding: pref.sharesOutstanding ?? null,
        nextPayoutDate: pref.nextPayoutDate || null,
        nextRecordDate: pref.dividendRecordDate || null,
        companyName: pm.companyName ?? null,
      },
      source: `${DATA_BASE} (${TICKER} / ${pref.ticker})`,
      lastUpdate: full?.timestamp || new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch Strive data';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

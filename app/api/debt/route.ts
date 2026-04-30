import { NextResponse } from 'next/server';
import { parseDebtApi, computeRate } from '@/lib/debt';
import { sendSlackAlert } from '@/lib/slack';
import { getBTCPriceWithCache } from '@/lib/btc-cache';

// Disable caching to ensure real-time data and avoid stale values
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getBTCPrice(): Promise<number> {
    // Use shared cache to avoid duplicate API calls
    return getBTCPriceWithCache();
}

interface MTSCacheEntry {
    annualSpending: number;
    annualDeficit: number;
    timestamp: number;
}

const MTS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (spending/deficit data changes once per year)
let mtsCache: MTSCacheEntry | null = null;

interface DebtCacheEntry {
    data: DebtApiResponse;
    timestamp: number;
}

interface DebtApiResponse {
    latestRecordDateUTC: string;
    latestPublishedTotal: number;
    perSecond: number;
    estimatedTodayDelta: number;
    liveEstimateNow: number;
    lastDailyDelta: number;
    btcPriceUsd: number;
    latestPublishedTotalBTC: number;
    perSecondBTC: number;
    estimatedTodayDeltaBTC: number;
    liveEstimateNowBTC: number;
    lastDailyDeltaBTC: number;
    annualFederalSpending: number;
    annualBudgetDeficit: number;
}

interface MtsTable1ApiRow {
    record_date: string;
    record_calendar_month: string;
    current_month_gross_outly_amt: string;
    current_month_dfct_sur_amt: string;
}

interface MtsTable1ApiResponse {
    success?: boolean;
    data?: MtsTable1ApiRow[];
}

const DEBT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - la deuda cambia lentamente (una vez al día)
let debtCache: DebtCacheEntry | null = null;
const RETRYABLE_HTTP_STATUS = new Set([
    408, 425, 429, 500, 502, 503, 504, 520, 522, 523, 524, 525, 526, 530,
]);
const TREASURY_DEBT_RETRY_ATTEMPTS = 2;
const TREASURY_MTS_RETRY_ATTEMPTS = 1;
const TREASURY_DEBT_TIMEOUT_MS = 7000;
const TREASURY_MTS_TIMEOUT_MS = 5000;
const FISCAL_PROXY_BASE_URL = 'https://rtv-proxy.vercel.app/api/fiscal';
const FISCAL_DEBT_URL = `${FISCAL_PROXY_BASE_URL}/debt`;
const FISCAL_REVENUE_URL = `${FISCAL_PROXY_BASE_URL}/revenue`;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function fetchWithRetry(
    url: string,
    init: Omit<RequestInit, 'signal'>,
    label: string,
    options: {
        attempts: number;
        timeoutMs: number;
    },
): Promise<Response> {
    let lastError: unknown;
    const { attempts, timeoutMs } = options;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                ...init,
                signal: AbortSignal.timeout(timeoutMs),
            });

            if (response.ok) {
                return response;
            }

            const status = response.status;

            if (attempt < attempts && RETRYABLE_HTTP_STATUS.has(status)) {
                await delay(300 * attempt);
                continue;
            }

            throw new Error(`${label} API error: ${status}`);
        } catch (error) {
            lastError = error;

            if (attempt < attempts) {
                await delay(300 * attempt);
                continue;
            }
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new Error(`${label} API request failed`);
}

async function getFederalSpendingAndDeficit() {
    const now = Date.now();

    // Return cached data if still valid (spending/deficit only changes once per fiscal year)
    if (mtsCache && now - mtsCache.timestamp < MTS_CACHE_DURATION) {
        return {
            annualSpending: mtsCache.annualSpending,
            annualDeficit: mtsCache.annualDeficit,
        };
    }

    try {
        // Strategy: Fetch the FINAL Fiscal Year totals (Year-to-Date for September)
        // This ensures we show the full annual impact (approx $7T Spending, $1.8T Deficit)
        // rather than just the first month of the new fiscal year (~$600B).

        // 1. Fetch recent "Year-to-Date" records
        const url = FISCAL_REVENUE_URL;

        const response = await fetchWithRetry(
            url,
            {
                next: { revalidate: 3600 },
                cache: 'no-store',
            },
            'MTS Table 1',
            {
                attempts: TREASURY_MTS_RETRY_ATTEMPTS,
                timeoutMs: TREASURY_MTS_TIMEOUT_MS,
            },
        );

        if (!response.ok) {
            const errorMsg = `MTS Table 1 API error: ${response.status}`;
            // Log but don't break the whole app if just spending data fails,
            // but alerting is good to know it's broken
            void sendSlackAlert(errorMsg);
            throw new Error(errorMsg);
        }

        const json = (await response.json()) as MtsTable1ApiResponse;

        if (json.success === false) {
            throw new Error('Fiscal revenue proxy returned success=false');
        }

        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
            throw new Error('No MTS Table 1 data returned');
        }

        const parsedRows = json.data
            .map((row) => ({
                row,
                spending: Number.parseFloat(row.current_month_gross_outly_amt || '0'),
            }))
            .filter(({ spending }) => Number.isFinite(spending) && spending > 0);

        if (parsedRows.length === 0) {
            throw new Error('No valid MTS Table 1 spending rows returned');
        }

        const pickBestRow = (rows: typeof parsedRows) => {
            if (rows.length === 0) {
                return null;
            }

            return rows.reduce((best, current) =>
                current.spending > best.spending ? current : best,
            );
        };

        // 2. Find the latest September record (Month 09)
        // This represents the completed fiscal year.
        let targetRow = pickBestRow(
            parsedRows.filter(({ row }) => row.record_calendar_month === '09'),
        )?.row;

        if (!targetRow) {
            console.warn(
                'No September record found in last 12 months. Defaulting to latest available.',
            );
            const latestBestRow = pickBestRow(parsedRows);

            if (!latestBestRow) {
                throw new Error('No fallback MTS row available');
            }
            targetRow = latestBestRow.row;
        }

        const fytdSpending = parseFloat(targetRow.current_month_gross_outly_amt || '0');
        const fytdDeficit = parseFloat(targetRow.current_month_dfct_sur_amt || '0');

        const result = {
            annualSpending: fytdSpending,
            annualDeficit: Math.abs(fytdDeficit), // Ensure positive for display
        };

        // Update cache
        mtsCache = {
            ...result,
            timestamp: now,
        };

        return result;
    } catch (error) {
        console.error('Error fetching FYTD data:', error);

        // Return cached data if available, even if expired
        if (mtsCache) {
            return {
                annualSpending: mtsCache.annualSpending,
                annualDeficit: mtsCache.annualDeficit,
            };
        }

        return {
            annualSpending: 0,
            annualDeficit: 0,
        };
    }
}

export async function GET() {
    const now = Date.now();

    // Return cached data if still valid (15 minutes)
    if (debtCache && now - debtCache.timestamp < DEBT_CACHE_DURATION) {
        return NextResponse.json(
            { ...debtCache.data, stale: false, source: 'live-cache' },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15 minutes cache
                    'X-Debt-Data-Source': 'live-cache',
                },
            },
        );
    }

    try {
        const url = FISCAL_DEBT_URL;

        const response = await fetchWithRetry(
            url,
            {
                next: { revalidate: 0 },
                cache: 'no-store',
            },
            'Treasury',
            {
                attempts: TREASURY_DEBT_RETRY_ATTEMPTS,
                timeoutMs: TREASURY_DEBT_TIMEOUT_MS,
            },
        );

        if (!response.ok) {
            const errorMsg = `Treasury API error: ${response.status}`;
            await sendSlackAlert(errorMsg);
            throw new Error(errorMsg);
        }

        const json = await response.json();

        if (json && typeof json === 'object' && 'success' in json && json.success === false) {
            throw new Error('Fiscal debt proxy returned success=false');
        }
        const rows = parseDebtApi(json);

        if (rows.length === 0) {
            throw new Error('Treasury API returned no valid debt rows');
        }

        const calculation =
            rows.length >= 2
                ? computeRate(rows)
                : {
                      latestDateUTC: rows[0].recordDate.toISOString(),
                      latestTotal: rows[0].totalDebt,
                      perSecond: 0,
                      estimatedTodayDelta: 0,
                      liveNow: rows[0].totalDebt,
                      lastDelta: 0,
                  };

        // Fetch dependent data in parallel to keep endpoint latency bounded.
        const [btcPriceUsd, { annualSpending, annualDeficit }] = await Promise.all([
            getBTCPrice(),
            getFederalSpendingAndDeficit(),
        ]);

        const result = {
            latestRecordDateUTC: calculation.latestDateUTC,
            latestPublishedTotal: calculation.latestTotal,
            perSecond: calculation.perSecond,
            estimatedTodayDelta: calculation.estimatedTodayDelta,
            liveEstimateNow: calculation.liveNow,
            lastDailyDelta: calculation.lastDelta,
            btcPriceUsd,
            latestPublishedTotalBTC: calculation.latestTotal / btcPriceUsd,
            perSecondBTC: calculation.perSecond / btcPriceUsd,
            estimatedTodayDeltaBTC: calculation.estimatedTodayDelta / btcPriceUsd,
            liveEstimateNowBTC: calculation.liveNow / btcPriceUsd,
            lastDailyDeltaBTC: calculation.lastDelta / btcPriceUsd,
            annualFederalSpending: annualSpending,
            annualBudgetDeficit: annualDeficit,
        };

        // Update cache
        debtCache = {
            data: result,
            timestamp: now,
        };

        const nextResponse = NextResponse.json({
            ...result,
            stale: false,
            source: 'live',
        });
        nextResponse.headers.set(
            'Cache-Control',
            'public, s-maxage=900, stale-while-revalidate=1800', // 15 minutes cache
        );
        nextResponse.headers.set('X-Debt-Data-Source', 'live');

        return nextResponse;
    } catch (error) {
        console.error('Error fetching debt data:', error);

        // Send critical alert
        const errorMsg = error instanceof Error ? error.message : 'Unknown error in Debt API';
        // Do not block response path on alerting/network side-effects.
        void sendSlackAlert(`CRITICAL FAILURE: ${errorMsg}`);

        // Prefer stale cache over hard failure to keep the slide usable.
        if (debtCache?.data) {
            return NextResponse.json(
                { ...debtCache.data, stale: true, source: 'stale-cache' },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'no-store',
                        'X-Debt-Data-Source': 'stale-cache',
                        'X-Debt-Error-Reason': errorMsg.slice(0, 120),
                    },
                },
            );
        }

        // No synthetic values: if no real cache is available, fail explicitly.
        return NextResponse.json(
            {
                source: 'fallback',
                error: 'Failed to fetch live debt data and no cached snapshot is available',
            },
            {
                status: 503,
                headers: {
                    'Cache-Control': 'no-store',
                    'X-Debt-Data-Source': 'fallback',
                    'X-Debt-Error-Reason': errorMsg.slice(0, 120),
                },
            },
        );
    }
}

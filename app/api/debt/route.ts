import { NextResponse } from "next/server";
import { parseDebtApi, computeRate } from "@/lib/debt";
import { sendSlackAlert } from "@/lib/slack";
import { getBTCPriceWithCache } from "@/lib/btc-cache";

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
  data?: MtsTable1ApiRow[];
}

const DEBT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - la deuda cambia lentamente (una vez al día)
let debtCache: DebtCacheEntry | null = null;
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 522, 523, 524, 525, 526, 530]);
const TREASURY_RETRY_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  attempts = TREASURY_RETRY_ATTEMPTS
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
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
  if (mtsCache && (now - mtsCache.timestamp) < MTS_CACHE_DURATION) {
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
    const url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1?filter=classification_desc:eq:Year-to-Date&sort=-record_date&page[size]=12";
    
    const response = await fetchWithRetry(url, {
      next: { revalidate: 3600 }, 
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }, "MTS Table 1");

    if (!response.ok) {
      const errorMsg = `MTS Table 1 API error: ${response.status}`;
      // Log but don't break the whole app if just spending data fails, 
      // but alerting is good to know it's broken
      void sendSlackAlert(errorMsg);
      throw new Error(errorMsg);
    }

    const json = (await response.json()) as MtsTable1ApiResponse;
    
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error("No MTS Table 1 data returned");
    }

    // 2. Find the latest September record (Month 09)
    // This represents the completed fiscal year.
    let targetRow = json.data.find((r) => r.record_calendar_month === "09");
    
    if (!targetRow) {
      console.warn("No September record found in last 12 months. Defaulting to latest available.");
      targetRow = json.data[0];
    }
    
    const fytdSpending = parseFloat(targetRow.current_month_gross_outly_amt || "0");
    const fytdDeficit = parseFloat(targetRow.current_month_dfct_sur_amt || "0");
    
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
    console.error("Error fetching FYTD data:", error);
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
  if (debtCache && (now - debtCache.timestamp) < DEBT_CACHE_DURATION) {
    return NextResponse.json(
      { ...debtCache.data, stale: false, source: "live-cache" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800", // 15 minutes cache
          "X-Debt-Data-Source": "live-cache",
        },
      }
    );
  }

  try {
    const url =
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=14";

    const response = await fetchWithRetry(url, {
      next: { revalidate: 0 },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }, "Treasury");

    if (!response.ok) {
      const errorMsg = `Treasury API error: ${response.status}`;
      await sendSlackAlert(errorMsg);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    const rows = parseDebtApi(json);
    if (rows.length === 0) {
      throw new Error("Treasury API returned no valid debt rows");
    }

    const calculation = rows.length >= 2
      ? computeRate(rows)
      : {
          latestDateUTC: rows[0].recordDate.toISOString(),
          latestTotal: rows[0].totalDebt,
          perSecond: 0,
          estimatedTodayDelta: 0,
          liveNow: rows[0].totalDebt,
          lastDelta: 0,
        };

    // Get BTC price and calculate BTC equivalents
    const btcPriceUsd = await getBTCPrice();
    
    // Get federal spending and deficit data
    const { annualSpending, annualDeficit } = await getFederalSpendingAndDeficit();

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
      source: "live",
    });
    nextResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=1800" // 15 minutes cache
    );
    nextResponse.headers.set("X-Debt-Data-Source", "live");

    return nextResponse;
  } catch (error) {
    console.error("Error fetching debt data:", error);
    
    // Send critical alert
    const errorMsg = error instanceof Error ? error.message : "Unknown error in Debt API";
    // Do not block response path on alerting/network side-effects.
    void sendSlackAlert(`CRITICAL FAILURE: ${errorMsg}`);

    // Prefer stale cache over hard failure to keep the slide usable.
    if (debtCache?.data) {
      return NextResponse.json(
        { ...debtCache.data, stale: true, source: "stale-cache" },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "X-Debt-Data-Source": "stale-cache",
            "X-Debt-Error-Reason": errorMsg.slice(0, 120),
          },
        }
      );
    }

    // No synthetic values: if no real cache is available, fail explicitly.
    return NextResponse.json(
      {
        source: "fallback",
        error: "Failed to fetch live debt data and no cached snapshot is available",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Debt-Data-Source": "fallback",
          "X-Debt-Error-Reason": errorMsg.slice(0, 120),
        },
      }
    );
  }
}

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
  data: any;
  timestamp: number;
}

const DEBT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - la deuda cambia lentamente (una vez al día)
let debtCache: DebtCacheEntry | null = null;

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
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, 
    });

    if (!response.ok) {
      const errorMsg = `MTS Table 1 API error: ${response.status}`;
      // Log but don't break the whole app if just spending data fails, 
      // but alerting is good to know it's broken
      await sendSlackAlert(errorMsg);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error("No MTS Table 1 data returned");
    }

    // 2. Find the latest September record (Month 09)
    // This represents the completed fiscal year.
    let targetRow = json.data.find((r: any) => r.record_calendar_month === "09");
    
    if (!targetRow) {
      console.warn("No September record found in last 12 months. Defaulting to latest available.");
      targetRow = json.data[0];
    } else {
      console.log(`Using Annual MTS data from: ${targetRow.record_date}`);
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
    return NextResponse.json(debtCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800", // 15 minutes cache
      },
    });
  }

  try {
    const url =
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=14";

    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorMsg = `Treasury API error: ${response.status}`;
      await sendSlackAlert(errorMsg);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    const rows = parseDebtApi(json);
    const calculation = computeRate(rows);

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

    const nextResponse = NextResponse.json(result);
    nextResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=1800" // 15 minutes cache
    );

    return nextResponse;
  } catch (error) {
    console.error("Error fetching debt data:", error);
    
    // Send critical alert
    const errorMsg = error instanceof Error ? error.message : "Unknown error in Debt API";
    await sendSlackAlert(`CRITICAL FAILURE: ${errorMsg}`);

    return NextResponse.json(
      { error: "Failed to fetch debt data" },
      { status: 500 }
    );
  }
}

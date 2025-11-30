import { NextResponse } from "next/server";
import { parseDebtApi, computeRate } from "@/lib/debt";
import { sendSlackAlert } from "@/lib/slack";

// Disable caching to ensure real-time data and avoid stale values
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

function parsePrice(priceString: string): number {
  // Remove $ and commas, then parse as float
  // Example: "$101,270.04" -> 101270.04
  const cleaned = priceString.replace(/[$,]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new Error(`Invalid price format: ${priceString}`);
  }
  return parsed;
}

async function getBTCPrice(): Promise<number> {
  try {
    // Fetch directly from Roxom API to avoid internal API calls
    const url =
      "https://rtvapi.roxom.com/btc/info?apiKey=60be7d11-ec67-4ac0-9241-da1cbdcba73d";
    const response = await fetch(url, {
      next: { revalidate: 0 },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorMsg = `Roxom API error: ${response.status}`;
      await sendSlackAlert(errorMsg);
      throw new Error(errorMsg);
    }

    const json = await response.json();
    const livePriceString = json.price?.live_price;

    if (!livePriceString || typeof livePriceString !== "string") {
      throw new Error("Invalid BTC price data from Roxom API");
    }

    return parsePrice(livePriceString);
  } catch (error) {
    console.error("Error fetching BTC price, using fallback:", error);
    // Fallback to a recent average BTC price if API fails
    return 95000; 
  }
}

async function getFederalSpendingAndDeficit() {
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
    
    return {
      annualSpending: fytdSpending,
      annualDeficit: Math.abs(fytdDeficit), // Ensure positive for display
    };
  } catch (error) {
    console.error("Error fetching FYTD data:", error);
    return {
      annualSpending: 0, 
      annualDeficit: 0,
    };
  }
}


export async function GET() {
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

    const nextResponse = NextResponse.json(result);
    nextResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
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

import { NextResponse } from "next/server";
import { parseDebtApi, computeRate } from "@/lib/debt";

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
      throw new Error(`Roxom API error: ${response.status}`);
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
    // MTS Table 5: Outlays of the U.S. Government
    // We fetch the latest available data (usually end of FY or latest month FYTD)
    // "Total Outlays" represents the fiscal year to date spending
    const url = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_5?sort=-record_date&page[size]=100";
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour is fine for monthly data
    });

    if (!response.ok) {
      throw new Error(`MTS API error: ${response.status}`);
    }

    const json = await response.json();
    
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid MTS data format");
    }

    // Find Total Outlays
    // FIX: Instead of just taking the first row (which might be partial FYTD if we are in Oct/Nov),
    // find the latest COMPLETED Fiscal Year data.
    // The US Fiscal Year ends in September (month "09").
    
    // Try to find the latest September entry (end of Fiscal Year)
    let outlaysRow = json.data.find((row: any) => 
      row.classification_desc === "Total Outlays" && row.record_calendar_month === "09"
    );
    
    // Fallback: If no September data found in recent page, use the absolute latest row found
    // (This ensures we at least show SOMETHING, even if it's partial FYTD, though usually we want full year)
    if (!outlaysRow) {
      outlaysRow = json.data.find((row: any) => row.classification_desc === "Total Outlays");
    }

    // Find Total Deficit (same logic, look for latest complete FY)
    let deficitRow = json.data.find((row: any) => 
      row.classification_desc === "Total Surplus (+) or Deficit (-)" && row.record_calendar_month === "09"
    );

    if (!deficitRow) {
      deficitRow = json.data.find((row: any) => row.classification_desc === "Total Surplus (+) or Deficit (-)");
    }

    let annualSpending = 0;
    let annualDeficit = 0;

    if (outlaysRow && outlaysRow.current_fytd_net_outly_amt) {
      annualSpending = parseFloat(outlaysRow.current_fytd_net_outly_amt);
    }

    if (deficitRow && deficitRow.current_fytd_net_outly_amt) {
      // Deficit is usually negative in this table ("-1775..."), so we take absolute value
      annualDeficit = Math.abs(parseFloat(deficitRow.current_fytd_net_outly_amt));
    }

    // Validation: If values are zero or unreasonably small (e.g. failed parse), use fallbacks
    if (annualSpending < 1_000_000_000 || isNaN(annualSpending)) {
      console.warn("Fetched annual spending seems invalid, using fallback");
      annualSpending = 6_752_000_000_000; // Fallback FY2024
    }
    
    if (annualDeficit < 1_000_000_000 || isNaN(annualDeficit)) {
      console.warn("Fetched annual deficit seems invalid, using fallback");
      annualDeficit = 1_833_000_000_000; // Fallback FY2024
    }

    return {
      annualSpending,
      annualDeficit,
    };
  } catch (error) {
    console.error("Error fetching spending/deficit data:", error);
    // Return fallback values (FY 2024 Actuals)
    return {
      annualSpending: 6_752_000_000_000, 
      annualDeficit: 1_833_000_000_000,
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
      throw new Error(`Treasury API error: ${response.status}`);
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
    return NextResponse.json(
      { error: "Failed to fetch debt data" },
      { status: 500 }
    );
  }
}

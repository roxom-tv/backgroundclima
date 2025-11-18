import { NextResponse } from "next/server";
import { parseDebtApi, computeRate } from "@/lib/debt";

export const revalidate = 300; // Revalidate every 5 minutes

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
      next: { revalidate: 60 },
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
    return 65000; // Approximate fallback
  }
}

async function getFederalSpendingAndDeficit() {
  try {
    // Get Monthly Treasury Statement data
    const currentYear = new Date().getFullYear();
    const url = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_5?filter=record_date:gte:${currentYear}-01-01&sort=-record_date&page[size]=100`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`MTS API error: ${response.status}`);
    }

    const json = await response.json();
    
    // Calculate fiscal year to date totals
    let totalReceipts = 0;
    let totalOutlays = 0;
    
    if (json.data && Array.isArray(json.data)) {
      for (const row of json.data) {
        // Sum up receipts and outlays
        if (row.current_fytd_net_rcpt_amt) {
          const receipts = parseFloat(row.current_fytd_net_rcpt_amt);
          if (!isNaN(receipts)) totalReceipts = Math.max(totalReceipts, receipts);
        }
        if (row.current_fytd_net_outly_amt) {
          const outlays = parseFloat(row.current_fytd_net_outly_amt);
          if (!isNaN(outlays)) totalOutlays = Math.max(totalOutlays, outlays);
        }
      }
    }

    // Convert from millions to actual dollars
    const annualSpending = totalOutlays * 1_000_000;
    const annualDeficit = (totalOutlays - totalReceipts) * 1_000_000;

    return {
      annualSpending: annualSpending > 0 ? annualSpending : 7_023_165_848_620,
      annualDeficit: annualDeficit > 0 ? annualDeficit : 1_748_017_294_780,
    };
  } catch (error) {
    console.error("Error fetching spending/deficit data:", error);
    // Return fallback values
    return {
      annualSpending: 7_023_165_848_620,
      annualDeficit: 1_748_017_294_780,
    };
  }
}

export async function GET() {
  try {
    const url =
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page[size]=14";

    const response = await fetch(url, {
      next: { revalidate: 300 },
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
      "public, s-maxage=300, stale-while-revalidate=600"
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


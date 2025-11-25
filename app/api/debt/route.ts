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
    // MTS Table 5: Total Outlays using line_code_nbr 5691
    const spendingUrl = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_5?filter=line_code_nbr:eq:5691&sort=-record_date&page[size]=1";
    
    const spendingResponse = await fetch(spendingUrl, {
      next: { revalidate: 3600 }, 
    });

    if (!spendingResponse.ok) {
      throw new Error(`MTS API error (spending): ${spendingResponse.status}`);
    }

    const spendingJson = await spendingResponse.json();
    
    if (!spendingJson.data || !Array.isArray(spendingJson.data) || spendingJson.data.length === 0) {
      throw new Error("No spending data returned from MTS API");
    }

    const spendingRow = spendingJson.data[0];
    // Use current_fytd_tot_outly_amt (not current_fytd_net_outly_amt)
    let annualSpending = parseFloat(spendingRow.current_fytd_tot_outly_amt || spendingRow.current_fytd_net_outly_amt || "0");

    // Calculate deficit: Outlays - Receipts
    // First, try to get Receipts from mts_table_2
    // If that fails, search mts_table_5 for any record with "Receipts" or calculate from available data
    let receipts = 0;
    
    // Strategy 1: Try mts_table_2 for Total Receipts
    const receiptsUrl = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_2?sort=-record_date&page[size]=50";
    console.log("Fetching receipts from:", receiptsUrl);
    const receiptsResponse = await fetch(receiptsUrl, { next: { revalidate: 3600 } });
    
    if (receiptsResponse.ok) {
      const receiptsJson = await receiptsResponse.json();
      console.log("Receipts API - Total records:", receiptsJson.meta?.["total-count"] || 0);
      
      if (receiptsJson.data && receiptsJson.data.length > 0) {
        // Look for "Total Receipts" by description or line_code_nbr
        const receiptsRow = receiptsJson.data.find((r: any) => 
          (r.classification_desc && r.classification_desc.toLowerCase().includes("total receipts")) ||
          r.line_code_nbr === "829"
        );
        
        if (receiptsRow) {
          // Try different field names
          receipts = parseFloat(
            receiptsRow.current_fytd_ytd_amt ||
            receiptsRow.current_fytd_budget_amt ||
            receiptsRow.current_fytd_receipt_amt ||
            "0"
          );
          console.log("Found receipts:", receipts, "from field:", Object.keys(receiptsRow).find(k => k.includes("fytd")));
        } else {
          console.log("Sample receipts records:", receiptsJson.data.slice(0, 3).map((r: any) => ({
            line_code: r.line_code_nbr,
            desc: r.classification_desc,
            fields: Object.keys(r).filter(k => k.includes("fytd"))
          })));
        }
      }
    }
    
    // Strategy 2: If receipts still 0, try to find it in mts_table_5
    if (receipts === 0) {
      console.log("Receipts not found in mts_table_2, searching mts_table_5...");
      const searchUrl = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_5?sort=-record_date&page[size]=100";
      const searchResponse = await fetch(searchUrl, { next: { revalidate: 3600 } });
      
      if (searchResponse.ok) {
        const searchJson = await searchResponse.json();
        const receiptsRow = searchJson.data?.find((r: any) => 
          r.classification_desc && r.classification_desc.toLowerCase().includes("receipts")
        );
        
        if (receiptsRow) {
          receipts = parseFloat(receiptsRow.current_fytd_net_outly_amt || receiptsRow.current_fytd_tot_outly_amt || "0");
          console.log("Found receipts in mts_table_5:", receipts);
        }
      }
    }
    
    // Calculate deficit
    let annualDeficit = 0;
    if (receipts > 0) {
      annualDeficit = Math.abs(annualSpending - receipts);
      console.log(`Deficit calculated: ${annualSpending} (outlays) - ${receipts} (receipts) = ${annualDeficit}`);
    } else {
      console.warn("Could not find receipts data, cannot calculate deficit. Will show N/A.");
    }

    // Validation: Ensure we have valid numbers
    // If invalid, return null instead of crashing everything.
    // This allows the frontend to show "N/A" for these specific fields while keeping the main Debt clock running.
    if (annualSpending <= 0 || isNaN(annualSpending)) {
      console.warn("Annual spending data unavailable or invalid:", annualSpending);
      annualSpending = 0; // Or null/undefined if type allows, but 0 is safer for calculations
    }
    
    if (annualDeficit <= 0 || isNaN(annualDeficit)) {
       console.warn("Annual deficit data unavailable or invalid:", annualDeficit);
       annualDeficit = 0;
    }

    return {
      annualSpending,
      annualDeficit,
    };
  } catch (error) {
    console.error("Error fetching spending/deficit data:", error);
    // Soft fail: Return 0s so the rest of the API (Debt clock) keeps working
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

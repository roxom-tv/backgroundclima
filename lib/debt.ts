export interface MtsTable1Row {
    record_date: string;
    classification_desc: string;
    current_month_gross_outly_amt: string; // Spending (FYTD when row is "Year-to-Date")
    current_month_dfct_sur_amt: string; // Deficit (FYTD when row is "Year-to-Date")
    record_fiscal_year: string;
}

export interface DebtRow {
    recordDate: Date;
    totalDebt: number;
}

export interface DebtCalculation {
    latestDateUTC: string;
    latestTotal: number;
    perSecond: number;
    estimatedTodayDelta: number;
    liveNow: number;
    lastDelta: number;
}

interface DebtApiResponse {
    data?: Array<{
        record_date?: string;
        tot_pub_debt_out_amt?: string;
    }>;
}

/**
 * Parse the Treasury API response into an array of debt rows
 */
export function parseDebtApi(apiResponse: DebtApiResponse): DebtRow[] {
    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
        throw new Error('Invalid API response format');
    }

    const rows: DebtRow[] = [];

    for (const item of apiResponse.data) {
        if (!item.record_date || !item.tot_pub_debt_out_amt) {
            continue;
        }

        const recordDate = new Date(item.record_date);
        // Convert to dollars and round to integer as requested
        // The API returns "tot_pub_debt_out_amt" which IS in dollars (with decimals for cents)
        // Example: "35946551234567.89" -> 35946551234568
        const totalDebt = Math.round(parseFloat(item.tot_pub_debt_out_amt));

        if (isNaN(totalDebt) || isNaN(recordDate.getTime())) {
            continue;
        }

        rows.push({
            recordDate,
            totalDebt,
        });
    }

    // Sort by date descending (most recent first)
    rows.sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());

    return rows;
}

/**
 * Compute the debt rate and live estimates based on historical data
 */
export function computeRate(rows: DebtRow[]): DebtCalculation {
    if (rows.length < 2) {
        throw new Error('Need at least 2 data points to compute rate');
    }

    // Most recent record
    const latest = rows[0];
    const latestDateUTC = latest.recordDate.toISOString();
    const latestTotal = latest.totalDebt;

    // Find the most recent daily change
    // Look for records from different days
    let lastDelta = 0;
    let previousRecord: DebtRow | null = null;

    for (let i = 0; i < rows.length; i++) {
        const current = rows[i];

        // Find the previous record from a different day
        for (let j = i + 1; j < rows.length; j++) {
            const candidate = rows[j];
            const currentDay = new Date(current.recordDate);
            currentDay.setHours(0, 0, 0, 0);
            const candidateDay = new Date(candidate.recordDate);
            candidateDay.setHours(0, 0, 0, 0);

            if (currentDay.getTime() !== candidateDay.getTime()) {
                previousRecord = candidate;
                lastDelta = current.totalDebt - candidate.totalDebt;
                break;
            }
        }

        if (previousRecord) {
            break;
        }
    }

    // If we couldn't find a daily delta, use the difference between first two records
    if (lastDelta === 0 && rows.length >= 2) {
        const timeDiff = rows[0].recordDate.getTime() - rows[1].recordDate.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        if (daysDiff > 0) {
            lastDelta = (rows[0].totalDebt - rows[1].totalDebt) / daysDiff;
        }
    }

    // Calculate per second rate based on daily change
    // Average daily change over the last few days
    let totalChange = 0;
    let dayCount = 0;

    for (let i = 0; i < Math.min(rows.length - 1, 7); i++) {
        const current = rows[i];
        const next = rows[i + 1];

        const timeDiff = current.recordDate.getTime() - next.recordDate.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        if (daysDiff > 0 && daysDiff <= 2) {
            const change = current.totalDebt - next.totalDebt;
            totalChange += change / daysDiff;
            dayCount++;
        }
    }

    const avgDailyChange = dayCount > 0 ? totalChange / dayCount : lastDelta;
    const perSecond = avgDailyChange / (24 * 60 * 60);

    // Calculate estimated change for today
    const now = new Date();

    // FIX: Calculate time difference from the ACTUAL latest record date, not just today's midnight
    // The API data is often a few days old (e.g. published on Monday for previous Thursday)
    const timeSinceLastRecord = now.getTime() - latest.recordDate.getTime();
    const secondsSinceLastRecord = timeSinceLastRecord / 1000;

    // Total estimated delta since the last official record
    const estimatedTotalDelta = perSecond * secondsSinceLastRecord;

    // Live estimate = latest published + estimated change since then
    const liveNow = latestTotal + estimatedTotalDelta;

    // For "today's" delta specifically (visual only)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const secondsSinceMidnight = (now.getTime() - todayStart.getTime()) / 1000;
    const estimatedTodayDelta = perSecond * secondsSinceMidnight;

    return {
        latestDateUTC,
        latestTotal,
        perSecond,
        estimatedTodayDelta,
        liveNow,
        lastDelta: avgDailyChange,
    };
}

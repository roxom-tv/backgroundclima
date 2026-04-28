/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format a number with commas (no currency symbol)
 */
export function formatNumber(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format a small rate (per second) with appropriate precision
 */
export function formatRate(rate: number): string {
    if (rate < 0.01) {
        return `$${rate.toFixed(4)}/sec`;
    }

    return `$${rate.toFixed(2)}/sec`;
}

/**
 * Format a number as BTC with appropriate precision
 */
export function formatBTC(btc: number): string {
    if (btc >= 1) {
        return `${btc.toLocaleString('en-US', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        })} BTC`;
    }

    return `${btc.toLocaleString('en-US', {
        maximumFractionDigits: 8,
        minimumFractionDigits: 8,
    })} BTC`;
}

/**
 * Format BTC without the "BTC" suffix (for large displays)
 */
export function formatBTCNumber(btc: number): string {
    if (btc >= 1) {
        return btc.toLocaleString('en-US', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        });
    }

    return btc.toLocaleString('en-US', {
        maximumFractionDigits: 8,
        minimumFractionDigits: 8,
    });
}

/**
 * Format BTC with "BTC" suffix and no decimals (for main debt counter)
 */
export function formatBTCMain(btc: number): string {
    return `${Math.round(btc).toLocaleString('en-US')} BTC`;
}

/**
 * Format BTC rate per second
 */
export function formatBTCRate(btcPerSecond: number): string {
    if (btcPerSecond >= 0.0001) {
        return `${btcPerSecond.toFixed(6)} BTC/sec`;
    }

    return `${btcPerSecond.toExponential(2)} BTC/sec`;
}

/**
 * Format satoshis with appropriate precision
 * Returns an object with the formatted number and the icon HTML
 */
export function formatSats(sats: number): { number: string; html: string } {
    const satoshiIcon = '<i class="fak fa-regular"></i>';
    let number: string;

    if (sats >= 1_000_000) {
        number = `${(sats / 1_000_000).toFixed(2)}M`;
    } else if (sats >= 1_000) {
        number = `${(sats / 1_000).toFixed(2)}K`;
    } else {
        number = `${Math.round(sats).toLocaleString('en-US')}`;
    }

    return {
        number,
        html: `${number} ${satoshiIcon} sats`,
    };
}

/**
 * Format USD in compact form (e.g., $2,500.50)
 */
export function formatUSDCompact(usd: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(usd);
}

/**
 * Format 24h change percentage with sign
 */
export function formatChange24h(changePct: number): string {
    const sign = changePct >= 0 ? '+' : '';

    return `${sign}${changePct.toFixed(2)}%`;
}

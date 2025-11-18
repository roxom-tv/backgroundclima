/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  
  /**
   * Format a number with commas (no currency symbol)
   */
  export function formatNumber(amount: number): string {
    return new Intl.NumberFormat("en-US", {
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
      return `${btc.toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })} BTC`;
    }
    return `${btc.toLocaleString("en-US", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 8,
    })} BTC`;
  }
  
  /**
   * Format BTC without the "BTC" suffix (for large displays)
   */
  export function formatBTCNumber(btc: number): string {
    if (btc >= 1) {
      return btc.toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
    }
    return btc.toLocaleString("en-US", {
      maximumFractionDigits: 8,
      minimumFractionDigits: 8,
    });
  }
  
  /**
   * Format BTC with "BTC" prefix and no decimals (for main debt counter)
   */
  export function formatBTCMain(btc: number): string {
    return `BTC ${Math.round(btc).toLocaleString("en-US")}`;
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
  
  
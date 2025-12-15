import { useEffect, useState } from "react";

export function useBTCPrice(initialPrice: number) {
  const [btcPrice, setBtcPrice] = useState(initialPrice);

  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        const response = await fetch("/api/btc-price", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.btcPriceUsd && typeof data.btcPriceUsd === "number") {
            setBtcPrice(data.btcPriceUsd);
          }
        }
      } catch (error) {
        // Silently fail and keep using current price
        console.error("Error fetching BTC price:", error);
      }
    };

    // Fetch immediately
    fetchBtcPrice();

    // Then fetch every 30 seconds (30000ms) - reduced from 2s to minimize API calls
    const interval = setInterval(fetchBtcPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  return btcPrice;
}

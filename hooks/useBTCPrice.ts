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

    // Then fetch every 2 minutes (120000ms) - optimized to minimize API calls while keeping data reasonably fresh
    const interval = setInterval(fetchBtcPrice, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return btcPrice;
}

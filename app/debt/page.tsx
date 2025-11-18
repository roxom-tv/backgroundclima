'use client';

import { useEffect, useState } from 'react';
import USDStats from '@/components/USDStats';

interface DebtData {
  liveEstimateNow: number;
  perSecond: number;
  annualFederalSpending: number;
  annualBudgetDeficit: number;
  btcPriceUsd: number;
}

export default function DebtPage() {
  const [debtData, setDebtData] = useState<DebtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebtData = async () => {
      try {
        const response = await fetch('/api/debt');
        if (!response.ok) {
          throw new Error('Failed to fetch debt data');
        }
        const data = await response.json();
        setDebtData({
          liveEstimateNow: data.liveEstimateNow,
          perSecond: data.perSecond,
          annualFederalSpending: data.annualFederalSpending,
          annualBudgetDeficit: data.annualBudgetDeficit,
          btcPriceUsd: data.btcPriceUsd,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching debt data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDebtData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading debt data...</div>
      </div>
    );
  }

  if (error || !debtData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">
          Error: {error || 'Failed to load debt data'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <USDStats
          liveDebtUSD={debtData.liveEstimateNow}
          perSecond={debtData.perSecond}
          base={debtData.liveEstimateNow}
          annualFederalSpending={debtData.annualFederalSpending}
          annualBudgetDeficit={debtData.annualBudgetDeficit}
          initialBtcPrice={debtData.btcPriceUsd}
        />
      </div>
    </div>
  );
}



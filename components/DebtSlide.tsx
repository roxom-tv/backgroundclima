'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import USDStats from '@/components/USDStats';

interface DebtData {
  liveEstimateNow: number;
  perSecond: number;
  annualFederalSpending: number;
  annualBudgetDeficit: number;
  btcPriceUsd: number;
}

interface DebtSlideProps {
  onDataLoaded?: () => void;
}

export default function DebtSlide({ onDataLoaded }: DebtSlideProps) {
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
        onDataLoaded?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching debt data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtData();
    // Refresh every 15 minutes
    const interval = setInterval(fetchDebtData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [onDataLoaded]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full w-full bg-black flex items-center justify-center"
      >
        <div className="text-white text-2xl animate-pulse tracking-wider">
          LOADING US DEBT DATA...
        </div>
      </motion.div>
    );
  }

  if (!debtData || error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full w-full bg-black flex items-center justify-center"
      >
        <div className="text-red-500 text-xl">
          Error loading debt data
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full bg-black"
    >
      <USDStats
        liveDebtUSD={debtData.liveEstimateNow}
        perSecond={debtData.perSecond}
        base={debtData.liveEstimateNow}
        annualFederalSpending={debtData.annualFederalSpending}
        annualBudgetDeficit={debtData.annualBudgetDeficit}
        initialBtcPrice={debtData.btcPriceUsd}
      />
    </motion.div>
  );
}



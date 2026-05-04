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

let sharedDebtData: DebtData | null = null;
let sharedDebtLoading = false;
let sharedDebtError: string | null = null;
let fetchPromise: Promise<DebtData | null> | null = null;

async function fetchDebtDataInternal(
    setData?: (value: DebtData | null) => void,
    setLoading?: (value: boolean) => void,
    setError?: (value: string | null) => void,
): Promise<DebtData | null> {
    if (fetchPromise) {
        return fetchPromise;
    }

    fetchPromise = (async () => {
        sharedDebtLoading = true;

        if (setLoading) {
            setLoading(true);
        }

        try {
            const response = await fetch('/api/debt', { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Debt API returned ${response.status}`);
            }

            const data = await response.json();
            const normalized: DebtData = {
                liveEstimateNow: data.liveEstimateNow,
                perSecond: data.perSecond,
                annualFederalSpending: data.annualFederalSpending,
                annualBudgetDeficit: data.annualBudgetDeficit,
                btcPriceUsd: data.btcPriceUsd,
            };

            sharedDebtData = normalized;
            sharedDebtError = null;

            if (setData) {
                setData(normalized);
            }
            if (setError) {
                setError(null);
            }

            return normalized;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            sharedDebtError = message;

            if (setError) {
                setError(message);
            }
            console.error('Error fetching debt data:', err);

            return null;
        } finally {
            sharedDebtLoading = false;

            if (setLoading) {
                setLoading(false);
            }
            fetchPromise = null;
        }
    })();

    return fetchPromise;
}

export async function prefetchDebtData(): Promise<DebtData | null> {
    if (sharedDebtData) {
        return sharedDebtData;
    }

    return fetchDebtDataInternal();
}

export default function DebtSlide() {
    const [debtData, setDebtData] = useState<DebtData | null>(sharedDebtData);
    const [loading, setLoading] = useState(!sharedDebtData || sharedDebtLoading);
    const [error, setError] = useState<string | null>(sharedDebtError);

    useEffect(() => {
        const load = async () => {
            await fetchDebtDataInternal(setDebtData, setLoading, setError);
        };

        if (sharedDebtData) {
            setDebtData(sharedDebtData);
            setLoading(false);
            setError(null);
        } else if (sharedDebtLoading) {
            setLoading(true);
        }

        load();

        // Refresh every 15 minutes
        const interval = setInterval(load, 15 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="h-full w-full bg-black flex items-center justify-center">
                <div className="text-white text-2xl animate-pulse tracking-wider">
                    LOADING US DEBT DATA.
                </div>
            </div>
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
                <div className="text-red-500 text-xl">Error loading debt data</div>
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

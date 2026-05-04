'use client';

import { motion } from 'framer-motion';
import { useMarketsSats } from '@/hooks/useMarketsSats';
import { formatSats, formatChange24h } from '@/lib/fmt';

const headerBgColor = 'bg-[#EF4444]/80';
const contentBgColor = 'bg-[#1A1A1A]/80';

function CommodityCard({
    title,
    usd,
    sats,
    change24hPct,
    loading,
}: {
    title: string;
    usd: number;
    sats: number;
    change24hPct: number | null;
    loading: boolean;
}) {
    const headerFont = {
        fontSize: 'clamp(calc(1.25rem - 3px), 1.8vw, calc(2.75rem - 3px))',
        lineHeight: '1.1',
        fontWeight: 900,
    };
    const lineFont = {
        fontSize: 'clamp(calc(1.5rem + 10px), 2.6vw, calc(4rem + 15px))',
        lineHeight: '1.1',
        fontWeight: 700,
    };
    const line24hFont = {
        fontSize: 'clamp(calc(1.25rem + 10px), 2vw, calc(3.5rem + 15px))',
        lineHeight: '1.1',
        fontWeight: 700,
    };

    return (
        <div className="flex flex-col shadow-xl overflow-hidden border border-white/10 w-full">
            <div
                className={`${headerBgColor} flex items-center justify-center shrink-0 min-h-[5rem] px-[1.25rem] py-[1rem]`}
            >
                <h2
                    className="text-white text-center tracking-wider uppercase truncate"
                    style={headerFont}
                >
                    {title}
                </h2>
            </div>
            <div
                className={`flex flex-col items-center justify-center w-full ${contentBgColor} px-[1.25rem] py-[1.5rem]`}
                style={{ textAlign: 'center' }}
            >
                {loading && usd === 0 ? (
                    <div className="text-white/70 text-center py-4" style={lineFont}>
                        ...
                    </div>
                ) : usd > 0 ? (
                    <div
                        className="flex flex-col items-center w-full py-2"
                        style={{ gap: '2.5rem' }}
                    >
                        <div className="w-full flex justify-center">
                            <span
                                className="inline-flex items-center gap-2 tabular-nums shrink-0"
                                style={{
                                    ...lineFont,
                                    color: '#F7931A',
                                    fontWeight: 600,
                                    transform: 'translateX(-13px)',
                                }}
                            >
                                <i className="fak fa-regular shrink-0" aria-hidden />
                                <span>{formatSats(sats).number}</span>
                            </span>
                        </div>
                        <div className="w-full flex justify-center">
                            <span
                                className="inline-block text-white tabular-nums whitespace-nowrap"
                                style={lineFont}
                            >
                                USD $
                                {usd.toLocaleString('en-US', {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        {change24hPct !== null && (
                            <div className="w-full flex justify-center">
                                <span
                                    className="inline-flex items-center gap-2 tabular-nums"
                                    style={{ ...line24hFont, fontWeight: 500 }}
                                >
                                    <span style={{ color: '#A5A5A5' }}>24h</span>
                                    <span
                                        className={
                                            change24hPct >= 0 ? 'text-green-400' : 'text-red-400'
                                        }
                                    >
                                        {formatChange24h(change24hPct)}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-white/60 text-center" style={lineFont}>
                        —
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MetalsSlide() {
    const { data, loading } = useMarketsSats();

    const gold = data?.metals.gold;
    const silver = data?.metals.silver;
    const oil = data?.oil?.wti; // WTI como representante de Oil
    const copper = data?.copper;

    return (
        <motion.div
            className="w-full h-full flex items-center justify-center relative bg-black overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <video
                className="absolute inset-0 w-full h-full object-cover blur-[8px] scale-105"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden
            >
                <source src="/stock-bg.mp4" type="video/mp4" />
            </video>
            {/* Grid de recuadros encima — 5px a la izquierda (el video queda fijo) */}
            <div
                className="relative z-10 w-full max-w-none grid grid-cols-2 gap-[4rem] items-start px-[2rem] -translate-x-[5px]"
                style={{ gridAutoRows: 'minmax(0, auto)' }}
            >
                <CommodityCard
                    title="GOLD (XAU) – SATS/TROY OZ"
                    usd={gold?.usd ?? 0}
                    sats={gold?.sats ?? 0}
                    change24hPct={gold?.change24hPct ?? null}
                    loading={loading}
                />
                <CommodityCard
                    title="OIL (WTI) – SATS/BARREL"
                    usd={oil?.usd ?? 0}
                    sats={oil?.sats ?? 0}
                    change24hPct={oil?.change24hPct ?? null}
                    loading={loading}
                />
                <CommodityCard
                    title="SILVER (XAG) – SATS/TROY OZ"
                    usd={silver?.usd ?? 0}
                    sats={silver?.sats ?? 0}
                    change24hPct={silver?.change24hPct ?? null}
                    loading={loading}
                />
                <CommodityCard
                    title="ISHARES COPPER (ETF) – SATS/SHARE"
                    usd={copper?.usd ?? 0}
                    sats={copper?.sats ?? 0}
                    change24hPct={copper?.change24hPct ?? null}
                    loading={loading}
                />
            </div>
        </motion.div>
    );
}

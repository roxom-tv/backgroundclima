import EarthHero from '@/components/EarthHero';

export default function EarthHeroPage() {
    return (
        <EarthHero>
            <section className="mx-auto max-w-3xl px-6 pb-24 text-center text-white/80">
                <p className="text-sm uppercase tracking-widest text-white/40">Below the hero</p>
                <p className="mt-4 text-base leading-relaxed">
                    Earth Hero ported from Roxoland — main broadcast UI at{' '}
                    <span className="text-white">/</span> is unchanged. Assets live under{' '}
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white/90">
                        public/assets
                    </code>{' '}
                    and{' '}
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white/90">
                        public/logo-gradient.png
                    </code>
                    .
                </p>
            </section>
        </EarthHero>
    );
}

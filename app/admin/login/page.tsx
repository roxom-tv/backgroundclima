'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLoginPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.push('/admin');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl font-mono uppercase tracking-wider animate-pulse">
                    LOADING...
                </div>
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🌍</div>
                    <h1 className="text-3xl font-bold text-white">Background Clima</h1>
                    <p className="text-gray-400 mt-2">Admin Panel</p>
                </div>

                {/* Sign In Card */}
                <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

                    <a
                        href="/auth/okta"
                        className="w-full bg-[#00ff00] hover:bg-[#00cc00] text-black font-mono text-xs uppercase tracking-wider py-2 px-4 transition-colors flex items-center justify-center gap-2 border-2 border-[#00ff00]"
                    >
                        Sign in with Okta
                    </a>
                </div>

                {/* Back to display link */}
                <div className="text-center mt-6">
                    <Link
                        href="/"
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        ← Back to Display
                    </Link>
                </div>
            </div>
        </div>
    );
}

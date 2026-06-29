'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type LoginResponse = { success: boolean };

const AdminLoginPageInternal = () => {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            setIsLoading(true);

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                const data = (await res.json()) as LoginResponse;

                if (data.success) {
                    router.push('/admin');
                } else {
                    setError('Incorrect password');
                }
            } catch {
                setError('Something went wrong. Please try again.');
            } finally {
                setIsLoading(false);
            }
        },
        [password, router],
    );

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

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <input
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder="Password"
                                disabled={isLoading}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-[#00ff00]"
                            />
                        </div>

                        {error !== null && (
                            <p className="text-red-400 text-xs font-mono mb-4">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || password.length === 0}
                            className="w-full bg-[#00ff00] hover:bg-[#00cc00] disabled:opacity-50 text-black font-mono text-xs uppercase tracking-wider py-2 px-4 transition-colors flex items-center justify-center gap-2 border-2 border-[#00ff00]"
                        >
                            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                    </form>
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
};

export const AdminLoginPage = memo(AdminLoginPageInternal);
AdminLoginPage.displayName = 'AdminLoginPage';

export default AdminLoginPage;

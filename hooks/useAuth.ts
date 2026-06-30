'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/auth/schema';

interface AuthState {
    user: User | null;
    isLoading: boolean;
}

interface UseAuthReturn extends AuthState {
    signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const loadUser = async () => {
            try {
                const res = await fetch('/api/me', { signal: controller.signal });

                if (res.ok) {
                    const data = (await res.json()) as { user: User };
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    setUser(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();

        return () => {
            controller.abort();
        };
    }, []);

    const signOut = useCallback(async () => {
        let location = '/admin/login';

        try {
            const res = await fetch('/auth/signout', { method: 'POST' });

            if (res.ok) {
                const data = (await res.json()) as { location?: string };

                if (data.location) {
                    location = data.location;
                }
            }
        } catch (err) {
            console.error('Sign out error:', err);
        }

        setUser(null);
        window.location.href = location;
    }, []);

    return {
        user,
        isLoading,
        signOut,
    };
}

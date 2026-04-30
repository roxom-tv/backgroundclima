'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: string | null;
}

interface UseAuthReturn extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize auth state
    useEffect(() => {
        // Check if environment variables are configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('Supabase environment variables are not configured');
            setError(
                'Supabase configuration missing. Please check environment variables in Vercel.',
            );
            setIsLoading(false);

            return;
        }

        let supabase;

        try {
            supabase = getSupabaseClient();
        } catch (err) {
            console.error('Failed to create Supabase client:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize Supabase client');
            setIsLoading(false);

            return;
        }

        // Get initial session
        const initAuth = async () => {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth init error:', error);
                    setError(error.message);
                } else {
                    setSession(session);
                    setUser(session?.user ?? null);
                }
            } catch (err) {
                console.error('Auth init error:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize auth');
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        let subscription: { unsubscribe: () => void } | null = null;

        try {
            const authStateChange = supabase.auth.onAuthStateChange(async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            });

            // onAuthStateChange returns { data: { subscription: Subscription } }
            // Extract the subscription and create a wrapper
            if (authStateChange?.data?.subscription) {
                const sub = authStateChange.data.subscription;
                subscription = {
                    unsubscribe: () => {
                        if (sub && typeof sub.unsubscribe === 'function') {
                            sub.unsubscribe();
                        }
                    },
                };
            }
        } catch (err) {
            console.error('Failed to set up auth state listener:', err);
        }

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, []);

    // Sign in with email and password
    const signIn = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);

                return { error: error.message };
            }

            setSession(data.session);
            setUser(data.user);

            return { error: null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setError(message);

            return { error: message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Sign out
    const signOut = useCallback(async () => {
        setIsLoading(true);

        try {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
        } catch (err) {
            console.error('Sign out error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh session
    const refreshSession = useCallback(async () => {
        try {
            const supabase = getSupabaseClient();
            const {
                data: { session },
                error,
            } = await supabase.auth.refreshSession();

            if (error) {
                console.error('Session refresh error:', error);
            } else {
                setSession(session);
                setUser(session?.user ?? null);
            }
        } catch (err) {
            console.error('Session refresh error:', err);
        }
    }, []);

    return {
        user,
        session,
        isLoading,
        error,
        signIn,
        signOut,
        refreshSession,
    };
}

/**
 * Supabase Browser Client
 * Use this in client components ('use client')
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.'
    );
    // Return a mock client to prevent app crash, but it won't work
    // This allows the app to render and show error messages
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client-side usage
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}



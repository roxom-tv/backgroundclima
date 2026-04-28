import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function resolveSupabaseAdminEnv() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase admin environment variables. ' +
                'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
    }

    return { supabaseUrl, serviceRoleKey };
}

export function createServerAdminSupabaseClient() {
    const { supabaseUrl, serviceRoleKey } = resolveSupabaseAdminEnv();

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerAdminSupabaseClient } from '@/lib/supabase/admin';
import { settingsUpsertSchema } from '../_shared/schemas';

export async function GET() {
    try {
        const supabase = createServerAdminSupabaseClient();
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'global')
            .single();

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const settingsRow = data as { value?: unknown } | null;

        return NextResponse.json({ success: true, data: settingsRow?.value ?? null });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const payload = settingsUpsertSchema.parse(body);
        const supabase = createServerAdminSupabaseClient();

        // Workaround for strict Supabase generic inference in route handlers.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settingsTable = supabase.from('settings') as any;
        const { data, error } = await settingsTable
            .upsert({ key: payload.key, value: payload.value }, { onConflict: 'key' })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: error.issues },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 },
        );
    }
}

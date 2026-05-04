import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerAdminSupabaseClient } from '@/lib/supabase/admin';
import { eventInsertSchema } from '../_shared/schemas';

export async function GET() {
    try {
        const supabase = createServerAdminSupabaseClient();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data ?? [] });
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
        const payload = eventInsertSchema.parse(body);
        const supabase = createServerAdminSupabaseClient();

        // Workaround for strict Supabase generic inference in route handlers.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventsTable = supabase.from('events') as any;
        const { data, error } = await eventsTable.insert(payload).select().single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
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

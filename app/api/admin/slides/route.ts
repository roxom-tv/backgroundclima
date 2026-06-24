import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { slidesTable } from '@/lib/db/schema';
import {
    stringifySlideScheduleTimes,
    stringifySelectedEventIds,
    stringifyActiveDays,
    parseSlideScheduleTimes,
    parseSelectedEventIds,
    parseActiveDays,
} from '@/lib/db/schema/slides';
import { asc } from 'drizzle-orm';
import { slideInsertSchema } from '../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

function serializeSlideForResponse(row: typeof slidesTable.$inferSelect) {
    return {
        ...row,
        schedule_times: parseSlideScheduleTimes(row.schedule_times ?? null),
        selected_event_ids: parseSelectedEventIds(row.selected_event_ids ?? null),
        active_days: parseActiveDays(row.active_days ?? null),
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const db = await getDb();
        const rows = await db.select().from(slidesTable).orderBy(asc(slidesTable.order_index));

        return withRenewal(
            NextResponse.json({ success: true, data: rows.map(serializeSlideForResponse) }),
            auth.setCookie,
        );
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
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const body = await request.json();
        const payload = slideInsertSchema.parse(body);
        const db = await getDb();

        const [inserted] = await db
            .insert(slidesTable)
            .values({
                ...payload,
                schedule_times: stringifySlideScheduleTimes(payload.schedule_times ?? null),
                selected_event_ids: stringifySelectedEventIds(payload.selected_event_ids ?? null),
                active_days: stringifyActiveDays(payload.active_days ?? null),
            })
            .returning();

        return withRenewal(
            NextResponse.json(
                { success: true, data: serializeSlideForResponse(inserted) },
                { status: 201 },
            ),
            auth.setCookie,
        );
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

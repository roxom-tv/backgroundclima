import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { eventsTable } from '@/lib/db/schema';
import { parseScheduleTimes, stringifyScheduleTimes } from '@/lib/db/schema/events';
import { eventInsertSchema } from '../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

function serializeEventForResponse(row: typeof eventsTable.$inferSelect) {
    return {
        ...row,
        schedule_times: parseScheduleTimes(row.schedule_times ?? null),
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const db = await getDb();
        const rows = await db.select().from(eventsTable).orderBy(asc(eventsTable.order_index));

        return withRenewal(
            NextResponse.json({ success: true, data: rows.map(serializeEventForResponse) }),
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
        const payload = eventInsertSchema.parse(body);
        const db = await getDb();

        const [inserted] = await db
            .insert(eventsTable)
            .values({
                ...payload,
                schedule_times: stringifyScheduleTimes(payload.schedule_times ?? null),
            })
            .returning();

        return withRenewal(
            NextResponse.json(
                { success: true, data: serializeEventForResponse(inserted) },
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

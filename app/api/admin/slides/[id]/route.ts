import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { slidesTable } from '@/lib/db/schema';
import {
    parseSlideScheduleTimes,
    parseSelectedEventIds,
    parseActiveDays,
    stringifySlideScheduleTimes,
    stringifySelectedEventIds,
    stringifyActiveDays,
} from '@/lib/db/schema/slides';
import { slideUpdateSchema } from '../../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

const idParamSchema = z.object({ id: z.string().uuid() });

function serializeSlideForResponse(row: typeof slidesTable.$inferSelect) {
    return {
        ...row,
        schedule_times: parseSlideScheduleTimes(row.schedule_times ?? null),
        selected_event_ids: parseSelectedEventIds(row.selected_event_ids ?? null),
        active_days: parseActiveDays(row.active_days ?? null),
    };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const params = idParamSchema.parse(await context.params);
        const db = await getDb();

        const [row] = await db.select().from(slidesTable).where(eq(slidesTable.id, params.id));

        if (!row) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        return withRenewal(
            NextResponse.json({ success: true, data: serializeSlideForResponse(row) }),
            auth.setCookie,
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid request', details: error.issues },
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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const params = idParamSchema.parse(await context.params);
        const body = await request.json();
        const payload = slideUpdateSchema.parse(body);
        const db = await getDb();

        const updateValues: Record<string, unknown> = { ...payload };

        if ('schedule_times' in payload) {
            updateValues.schedule_times = stringifySlideScheduleTimes(
                payload.schedule_times ?? null,
            );
        }
        if ('selected_event_ids' in payload) {
            updateValues.selected_event_ids = stringifySelectedEventIds(
                payload.selected_event_ids ?? null,
            );
        }
        if ('active_days' in payload) {
            updateValues.active_days = stringifyActiveDays(payload.active_days ?? null);
        }

        const [updated] = await db
            .update(slidesTable)
            .set(updateValues)
            .where(eq(slidesTable.id, params.id))
            .returning();

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        return withRenewal(
            NextResponse.json({ success: true, data: serializeSlideForResponse(updated) }),
            auth.setCookie,
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid request', details: error.issues },
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const params = idParamSchema.parse(await context.params);
        const db = await getDb();

        await db.delete(slidesTable).where(eq(slidesTable.id, params.id));

        return withRenewal(NextResponse.json({ success: true }), auth.setCookie);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid request', details: error.issues },
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

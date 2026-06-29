import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sponsorsTable } from '@/lib/db/schema';
import { sponsorUpdateSchema } from '../../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

const idParamSchema = z.object({ id: z.string().uuid() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const params = idParamSchema.parse(await context.params);
        const body = await request.json();
        const payload = sponsorUpdateSchema.parse(body);
        const db = await getDb();

        const [updated] = await db
            .update(sponsorsTable)
            .set(payload)
            .where(eq(sponsorsTable.id, params.id))
            .returning();

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        return withRenewal(NextResponse.json({ success: true, data: updated }), auth.setCookie);
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

        await db.delete(sponsorsTable).where(eq(sponsorsTable.id, params.id));

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

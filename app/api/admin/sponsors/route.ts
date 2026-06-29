import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sponsorsTable } from '@/lib/db/schema';
import { sponsorInsertSchema } from '../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const db = await getDb();
        const rows = await db.select().from(sponsorsTable).orderBy(asc(sponsorsTable.order_index));

        return withRenewal(NextResponse.json({ success: true, data: rows }), auth.setCookie);
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
        const payload = sponsorInsertSchema.parse(body);
        const db = await getDb();

        const [inserted] = await db.insert(sponsorsTable).values(payload).returning();

        return withRenewal(
            NextResponse.json({ success: true, data: inserted }, { status: 201 }),
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

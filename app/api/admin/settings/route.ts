import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { settingsTable } from '@/lib/db/schema';
import { parseGlobalSettings, stringifyGlobalSettings } from '@/lib/db/schema/settings';
import { settingsUpsertSchema } from '../_shared/schemas';
import { requireAdmin, withRenewal } from '@/lib/auth/require-admin';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);

    if (auth.denied) {
        return auth.response;
    }

    try {
        const db = await getDb();
        const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'global'));

        if (!row) {
            return withRenewal(NextResponse.json({ success: true, data: null }), auth.setCookie);
        }

        return withRenewal(
            NextResponse.json({ success: true, data: parseGlobalSettings(row.value) }),
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
        const payload = settingsUpsertSchema.parse(body);
        const db = await getDb();

        const [upserted] = await db
            .insert(settingsTable)
            .values({
                key: payload.key,
                value: stringifyGlobalSettings(payload.value),
            })
            .onConflictDoUpdate({
                target: settingsTable.key,
                set: { value: stringifyGlobalSettings(payload.value) },
            })
            .returning();

        return withRenewal(
            NextResponse.json({
                success: true,
                data: { ...upserted, value: parseGlobalSettings(upserted.value) },
            }),
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

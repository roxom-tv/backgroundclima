import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminSupabaseClient } from '@/lib/supabase/admin';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 },
            );
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type' },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File exceeds 5MB limit' },
                { status: 400 },
            );
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `event-${Date.now()}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const supabase = createServerAdminSupabaseClient();

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from('sponsors')
            .upload(filePath, buffer, { contentType: file.type });

        if (uploadError) {
            return NextResponse.json(
                { success: false, error: uploadError.message },
                { status: 500 },
            );
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from('sponsors').getPublicUrl(filePath);

        return NextResponse.json({ success: true, data: { url: publicUrl } }, { status: 201 });
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

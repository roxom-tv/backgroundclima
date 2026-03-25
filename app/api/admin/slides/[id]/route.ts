import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerAdminSupabaseClient } from '@/lib/supabase/admin';
import { slideUpdateSchema } from '../../_shared/schemas';

const idParamSchema = z.object({ id: z.string().uuid() });

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = idParamSchema.parse(await context.params);
    const supabase = createServerAdminSupabaseClient();

    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = idParamSchema.parse(await context.params);
    const body = await request.json();
    const payload = slideUpdateSchema.parse(body);
    const supabase = createServerAdminSupabaseClient();

    // Workaround for strict Supabase generic inference in route handlers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slidesTable = supabase.from('slides') as any;
    const { data, error } = await slidesTable
      .update(payload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = idParamSchema.parse(await context.params);
    const supabase = createServerAdminSupabaseClient();

    const { error } = await supabase.from('slides').delete().eq('id', params.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

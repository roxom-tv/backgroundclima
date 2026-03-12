import { NextResponse } from 'next/server';
import { getConfigSnapshot } from '@/lib/config/config-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getConfigSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to fetch app config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app config' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

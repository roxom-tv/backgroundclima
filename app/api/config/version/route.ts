import { NextResponse } from 'next/server';
import { getConfigVersion } from '@/lib/config/config-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const version = await getConfigVersion();
    return NextResponse.json(
      { version, checkedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=8, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch config version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config version' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

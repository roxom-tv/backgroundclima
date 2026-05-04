import { NextResponse } from 'next/server';
import { getMetalsRateLimitInfo } from '@/lib/metals-rate-limit';

export async function GET() {
    try {
        const info = getMetalsRateLimitInfo();

        return NextResponse.json({
            metals: info,
        });
    } catch (error) {
        console.error('Error getting rate limit info:', error);

        return NextResponse.json({ error: 'Failed to get rate limit info' }, { status: 500 });
    }
}

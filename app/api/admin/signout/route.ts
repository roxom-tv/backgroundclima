import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/auth/config';
import { clearSessionCookie } from '@/lib/auth/cookies';

export async function POST(): Promise<NextResponse> {
    const cfgResult = getConfig();
    const response = NextResponse.json({ success: true });

    if (cfgResult.success) {
        const cookieHeaders = new Headers();
        clearSessionCookie(cookieHeaders, cfgResult.data);
        const setCookie = cookieHeaders.get('Set-Cookie');

        if (setCookie) {
            response.headers.set('Set-Cookie', setCookie);
        }
    }

    return response;
}

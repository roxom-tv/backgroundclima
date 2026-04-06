import { NextResponse } from 'next/server';

/**
 * STRC slide data — single entry point for the Next.js app.
 * The browser always calls `/api/strc/data` (same origin on Vercel).
 *
 * Configure `STRC_UPSTREAM_URL` (server-only) to the base URL of your STRC
 * Express service, e.g. http://127.0.0.1:3001 in dev or https://your-tunnel.ngrok.io
 * until you port that logic into this file / lib/strc.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const upstream = process.env.STRC_UPSTREAM_URL?.trim();
  if (!upstream) {
    return NextResponse.json(
      {
        error:
          'STRC_UPSTREAM_URL is not set. Add it in Vercel (or .env.local) as the base URL of your STRC data service (the Express app that exposes /api/data), or replace this route with inlined logic.',
      },
      { status: 503 }
    );
  }

  const base = upstream.replace(/\/$/, '');
  const target = `${base}/api/data`;

  try {
    const res = await fetch(target, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `STRC upstream returned ${res.status}`, target, body: body.slice(0, 200) },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upstream fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';

/**
 * Daily calendar reminder cron.
 *
 * Firestore one-shot reads removed (Portal JWT migration).
 * This route runs server-side with CRON_SECRET and has no user JWT, so
 * apiClient (sessionStorage JWT + cookie refresh) cannot authenticate here.
 * Until a service-account / internal secret path exists on rehearsalhub-api
 * for /notifications + /members, this cron is a no-op.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl || !process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Reminder backend configuration is missing.' }, { status: 503 });
    }

    const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/internal/cron/daily-reminders`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET },
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('Cron job error:', error);
    const message = error instanceof Error ? error.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

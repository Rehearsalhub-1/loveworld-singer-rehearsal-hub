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
    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      request.headers.get('x-vercel-cron') !== '1'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.warn(
      '[migration] daily-reminders cron: Firestore reads removed; JWT apiClient unavailable in cron context. No reminders sent.'
    );

    return NextResponse.json({
      success: true,
      message:
        'Daily reminder cron skipped: notifications/members reads require service auth not available in this route yet.',
      sentCount: 0,
    });
  } catch (error: unknown) {
    console.error('Cron job error:', error);
    const message = error instanceof Error ? error.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

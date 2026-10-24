import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';

export const dynamic = 'force-dynamic';

// Called daily by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectToMongoose();
  const sessions = await Attendance.autoLogoutExpiredSessions();
  return NextResponse.json({ success: true, autoLoggedOut: sessions.length });
}

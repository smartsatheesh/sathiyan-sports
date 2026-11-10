import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/lib/authConfig';
import { getFeeBoard, recordFeePayment } from '@/app/lib/fees.server';
import { PaymentError } from '@/app/lib/payments.server';
import { getPublicClub, listPublicClubs, scopeClub } from '@/app/lib/clubs.server';

export const dynamic = 'force-dynamic';

// Fee board: every subscribed member of one club with paid-till date and due status.
// Club admins always get their own club; the owner picks one with ?club= (default Sathiyan).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const club = scopeClub(session?.user, request.nextUrl.searchParams.get('club'));
  if (!club) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  try {
    const [board, clubInfo, clubs] = await Promise.all([
      getFeeBoard(club),
      getPublicClub(club),
      // only the owner switches between clubs
      session?.user?.role === 'admin' ? listPublicClubs() : Promise.resolve([]),
    ]);
    if (!clubInfo) return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    return NextResponse.json({ success: true, ...board, club: clubInfo, clubs });
  } catch (error) {
    console.error('Failed to load fee board:', error);
    return NextResponse.json({ success: false, error: 'Failed to load fees' }, { status: 500 });
  }
}

// Record a fee collected at the desk (cash or UPI already received)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => ({}));
  const club = scopeClub(session?.user, body.club);
  if (!session || !club) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { userId, months, amount, method, utr, startDate } = body;
    if (!mongoose.isValidObjectId(userId) || ![1, 3, 6, 12].includes(Number(months)) || !['cash', 'upi'].includes(method)) {
      return NextResponse.json({ success: false, error: 'Invalid payment details' }, { status: 400 });
    }

    const subscription = await recordFeePayment({
      userId,
      months: Number(months),
      amount: amount === undefined || amount === '' ? undefined : Number(amount),
      method,
      utr,
      startDate,
      adminName: session.user.name || 'admin',
      club,
    });
    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Failed to record fee:', error);
    return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 });
  }
}

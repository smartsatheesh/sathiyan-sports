import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Payment from '@/app/models/Payment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { clubFilter, isClubAdmin } from '@/app/lib/clubs';
import { listPublicClubs } from '@/app/lib/clubs.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await connectToMongoose();
    const status = request.nextUrl.searchParams.get('status') || 'submitted';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200);
    const requestedClub = request.nextUrl.searchParams.get('club');

    // Club admins only ever see their own club's membership fees; the owner sees everything
    // (or one club, when filtered).
    const scope: Record<string, unknown> = isClubAdmin(session?.user?.role)
      ? { kind: 'subscription', club: session!.user.club }
      : requestedClub && requestedClub !== 'all'
        ? clubFilter(requestedClub)
        : {};
    const query = { ...scope, ...(['submitted', 'confirmed', 'rejected'].includes(status) ? { status } : {}) };
    const [payments, pendingCount, clubs] = await Promise.all([
      (Payment.find as any)(query).sort({ createdAt: -1 }).limit(limit).lean(),
      (Payment.countDocuments as any)({ ...scope, status: 'submitted' }),
      listPublicClubs(), // names for receipts; the owner also filters by them
    ]);

    return NextResponse.json({ success: true, payments, pendingCount, clubs });
  } catch (error) {
    console.error('Failed to list payments:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payments' }, { status: 500 });
  }
}

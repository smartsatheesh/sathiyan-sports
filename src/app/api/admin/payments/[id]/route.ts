import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/lib/authConfig';
import { decidePayment, PaymentError } from '@/app/lib/payments.server';
import { connectToMongoose } from '@/app/server/mongodb';
import Payment from '@/app/models/Payment';
import { isClubAdmin } from '@/app/lib/clubs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== 'admin' && !isClubAdmin(role)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ success: false, error: 'Invalid payment id' }, { status: 400 });
  }
  if (isClubAdmin(role)) {
    // a club admin may only decide their own club's membership-fee payments
    await connectToMongoose();
    const own = await (Payment.exists as any)({ _id: params.id, kind: 'subscription', club: session!.user.club });
    if (!own) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  try {
    const { action, note } = await request.json();
    if (action !== 'confirm' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Action must be confirm or reject' }, { status: 400 });
    }
    const payment = await decidePayment(params.id, action, session.user.name || 'admin', String(note || '').slice(0, 300));
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Payment decision failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to update payment' }, { status: 500 });
  }
}

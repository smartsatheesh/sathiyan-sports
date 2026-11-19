import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import Subscription from '@/app/models/Subscription';
import { editFeePeriod, getMemberHistory } from '@/app/lib/fees.server';
import { syncUserFeeStatus } from '@/app/lib/feeStatus.server';
import { PaymentError } from '@/app/lib/payments.server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { scopeClub } from '@/app/lib/clubs.server';
import { clubOf } from '@/app/lib/clubs';

/** The member, if the signed-in admin may manage them (club admins: own club only). */
async function memberInScope(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  await connectToMongoose();
  const member = await (User.findById as any)(userId).select('club').lean();
  if (!member) return null;
  // the owner may act on any club's member; a club admin only on their own
  const club = scopeClub(session.user, clubOf(member));
  return club === clubOf(member) ? member : null;
}

export const dynamic = 'force-dynamic';

// Payment history for one member
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  if (!mongoose.isValidObjectId(params.userId)) {
    return NextResponse.json({ success: false, error: 'Invalid member' }, { status: 400 });
  }
  if (!(await memberInScope(params.userId))) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
  }
  const history = await getMemberHistory(params.userId);
  return NextResponse.json({ success: true, history });
}

// { action: 'reminded' } logs that a WhatsApp reminder was opened
// { action: 'markLeft' } stops tracking fees for a member who has left
// { action: 'deletePeriod', subscriptionId } removes a period entered by mistake
// { action: 'editPeriod', subscriptionId, startDate, endDate, amount, method, paidOn } corrects one
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  if (!mongoose.isValidObjectId(params.userId)) {
    return NextResponse.json({ success: false, error: 'Invalid member' }, { status: 400 });
  }
  if (!(await memberInScope(params.userId))) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const { action, subscriptionId } = body;

  if (action === 'editPeriod') {
    if (!mongoose.isValidObjectId(subscriptionId) || !['cash', 'upi'].includes(body.method)) {
      return NextResponse.json({ success: false, error: 'Invalid period details' }, { status: 400 });
    }
    try {
      const session = await getServerSession(authOptions);
      const subscription = await editFeePeriod({
        userId: params.userId,
        subscriptionId,
        startDate: body.startDate,
        endDate: body.endDate,
        amount: Number(body.amount),
        method: body.method,
        paidOn: body.paidOn || undefined,
        adminName: session?.user?.name || 'admin',
      });
      return NextResponse.json({ success: true, subscription });
    } catch (error) {
      if (error instanceof PaymentError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Failed to edit fee period:', error);
      return NextResponse.json({ success: false, error: 'Failed to update the period' }, { status: 500 });
    }
  }

  if (action === 'reminded') {
    await (User.findByIdAndUpdate as any)(params.userId, { feeReminderAt: new Date() });
    return NextResponse.json({ success: true });
  }

  if (action === 'markLeft') {
    await (User.findByIdAndUpdate as any)(params.userId, { subscribed: 'no', hasActiveSubscription: false });
    return NextResponse.json({ success: true });
  }

  if (action === 'deletePeriod' && mongoose.isValidObjectId(subscriptionId)) {
    const removed = await (Subscription.findOneAndDelete as any)({ _id: subscriptionId, userId: params.userId });
    if (!removed) return NextResponse.json({ success: false, error: 'Period not found' }, { status: 404 });
    await syncUserFeeStatus(params.userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

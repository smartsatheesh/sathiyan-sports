import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import Subscription from '@/app/models/Subscription';
import { getMemberHistory } from '@/app/lib/fees.server';
import { syncUserFeeStatus } from '@/app/lib/feeStatus.server';

export const dynamic = 'force-dynamic';

// Payment history for one member
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  if (!mongoose.isValidObjectId(params.userId)) {
    return NextResponse.json({ success: false, error: 'Invalid member' }, { status: 400 });
  }
  const history = await getMemberHistory(params.userId);
  return NextResponse.json({ success: true, history });
}

// { action: 'reminded' } logs that a WhatsApp reminder was opened
// { action: 'markLeft' } stops tracking fees for a member who has left
// { action: 'deletePeriod', subscriptionId } removes a period entered by mistake
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  if (!mongoose.isValidObjectId(params.userId)) {
    return NextResponse.json({ success: false, error: 'Invalid member' }, { status: 400 });
  }
  await connectToMongoose();
  const { action, subscriptionId } = await request.json();

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

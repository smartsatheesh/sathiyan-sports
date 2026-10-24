import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import CoachPlan from '@/app/models/CoachPlan';

/** Loads a plan the caller may access: their own, or any plan for admins/coaches. */
export async function loadPlan(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Please log in' }, { status: 401 }) };
  if (!mongoose.isValidObjectId(id)) return { error: NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 }) };

  await connectToMongoose();
  const doc = await (CoachPlan.findById as any)(id);
  const isStaff = session.user.role === 'admin' || session.user.role === 'coach';
  if (!doc || (!isStaff && String(doc.userId) !== session.user.id)) {
    return { error: NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 }) };
  }
  return { doc, session };
}

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import { newResetToken } from '@/app/lib/resetToken.server';
import { SITE_URL } from '@/app/lib/fees.server';

export const dynamic = 'force-dynamic';

const LINK_HOURS = 24;

// GET: open reset requests (last 7 days), or ?q= to find any member
export async function GET(request: NextRequest) {
  await connectToMongoose();
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const filter = q
    ? { $or: [{ name: { $regex: escape(q), $options: 'i' } }, { champId: { $regex: escape(q), $options: 'i' } }, { mobile: { $regex: escape(q) } }] }
    : { resetRequestedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };

  const users = await (User.find as any)(filter)
    .select('name champId mobile phone champType resetRequestedAt')
    .sort({ resetRequestedAt: -1 })
    .limit(30)
    .lean();
  return NextResponse.json({ success: true, users });
}

// POST { userId }: create a one-time reset link for the admin to send on WhatsApp
export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid member' }, { status: 400 });
  }

  await connectToMongoose();
  const { token, hash } = newResetToken();
  const user = await (User.findByIdAndUpdate as any)(
    userId,
    {
      $set: { resetPasswordToken: hash, resetPasswordExpires: new Date(Date.now() + LINK_HOURS * 60 * 60 * 1000) },
      $unset: { resetRequestedAt: 1 },
    },
    { new: true }
  ).select('name champId mobile phone');
  if (!user) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    link: `${SITE_URL}/auth/reset-password?token=${token}`,
    expiresInHours: LINK_HOURS,
    user: { name: user.name, champId: user.champId, mobile: user.mobile || user.phone },
  });
}

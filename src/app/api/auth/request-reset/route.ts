import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';

// Member asks for a password reset. The academy sees the request in
// Admin → Password resets and sends a one-time link on WhatsApp (free, no SMS gateway).
export async function POST(request: NextRequest) {
  try {
    const { mobile } = await request.json();
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      return NextResponse.json({ success: false, message: 'Please enter your 10-digit mobile number' }, { status: 400 });
    }

    await connectToMongoose();
    // Family members can share a mobile number, so flag every matching account
    await (User.updateMany as any)(
      { $or: [{ mobile: { $regex: `${digits}$` } }, { phone: { $regex: `${digits}$` } }] },
      { resetRequestedAt: new Date() }
    );

    // Same answer whether or not the number exists, so accounts can't be discovered
    return NextResponse.json({
      success: true,
      message: 'Request received. The academy will send you a reset link on WhatsApp shortly.',
    });
  } catch (error) {
    console.error('Reset request failed:', error);
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

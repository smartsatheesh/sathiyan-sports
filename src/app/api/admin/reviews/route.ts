import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Review from '@/app/models/Review';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectToMongoose();
  const reviews = await (Review.find as any)({}).sort({ status: 1, updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({ success: true, reviews });
}

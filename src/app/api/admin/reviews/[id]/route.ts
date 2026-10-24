import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import Review from '@/app/models/Review';

// PATCH { status: 'approved' | 'hidden' } — only approved reviews show on the homepage
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ success: false, error: 'Invalid review' }, { status: 400 });
  const { status } = await request.json();
  if (!['approved', 'hidden'].includes(status)) return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  await connectToMongoose();
  const updated = await (Review.findByIdAndUpdate as any)(params.id, { status }, { new: true });
  if (!updated) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

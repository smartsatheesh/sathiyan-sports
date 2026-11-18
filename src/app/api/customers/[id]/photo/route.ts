import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import Customer from '@/app/models/Customer';

// Serves a customer's photo (set by the admin) for the booking champs on the home page.
// URLs carry ?v=<updatedAt>, so they can be cached for a long time.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) return new NextResponse(null, { status: 404 });
  await connectToMongoose();
  const customer = await (Customer.findById as any)(params.id).select('+photo showOnLeaderboard').lean();
  const match = customer?.showOnLeaderboard !== false ? customer?.photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/) : null;
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

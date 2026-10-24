import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/app/server/mongodb';
import Inventory from '@/app/models/Inventory';

// Serves a product photo. URLs carry ?v=<updatedAt>, so they can be cached for a long time.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) return new NextResponse(null, { status: 404 });
  await connectToMongoose();
  const product = await (Inventory.findById as any)(params.id).select('+image').lean();
  const match = product?.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

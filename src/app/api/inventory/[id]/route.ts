import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Inventory from '@/app/models/Inventory';
import { parseProduct } from '@/app/lib/inventory.server';

async function adminOnly(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return { denied: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
  }
  if (!mongoose.isValidObjectId(id)) {
    return { denied: NextResponse.json({ success: false, error: 'Invalid product' }, { status: 400 }) };
  }
  await connectToMongoose();
  return { session };
}

// Edit product details (stock changes go through PATCH so they're logged)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { denied } = await adminOnly(params.id);
  if (denied) return denied;
  const [data, error] = parseProduct(await request.json(), { partial: true });
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });
  delete data.stock;

  const product = await (Inventory.findByIdAndUpdate as any)(params.id, data, { new: true });
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

// { change: +n | -n, reason } adjusts stock and records it in the history
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { denied, session } = await adminOnly(params.id);
  if (denied) return denied;
  const { change, reason } = await request.json();
  const n = Math.trunc(Number(change));
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 100000) {
    return NextResponse.json({ success: false, error: 'Invalid quantity' }, { status: 400 });
  }

  const product = await (Inventory.findByIdAndUpdate as any)(
    params.id,
    {
      $inc: { stock: n },
      $push: { history: { $each: [{ change: n, reason: String(reason || (n > 0 ? 'Received' : 'Sold/used')).slice(0, 100), by: session!.user.name }], $slice: -200 } },
    },
    { new: true }
  ).select('stock');
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ success: true, stock: product.stock });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { denied } = await adminOnly(params.id);
  if (denied) return denied;
  await (Inventory.findByIdAndDelete as any)(params.id);
  return NextResponse.json({ success: true });
}

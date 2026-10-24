import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Expense from '@/app/models/Expense';
import { parseExpense } from '@/app/lib/expenses.server';

async function guard(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
  }
  if (!mongoose.isValidObjectId(id)) {
    return { error: NextResponse.json({ success: false, error: 'Invalid expense' }, { status: 400 }) };
  }
  await connectToMongoose();
  return { session };
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: denied, session } = await guard(params.id);
  if (denied) return denied;

  const existing = await (Expense.findById as any)(params.id).lean();
  if (!existing) return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });

  // Old entries may use names/categories since removed from Settings; allow keeping them
  const body = await request.json();
  const allowLegacy = body.paidBy === existing.paidBy && body.category === existing.category;
  const [data, error] = await parseExpense({ ...body, allowLegacy });
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  const expense = await (Expense.findByIdAndUpdate as any)(
    params.id,
    { ...data, updatedBy: session!.user.id },
    { new: true }
  );
  return NextResponse.json({ success: true, expense });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error: denied } = await guard(params.id);
  if (denied) return denied;
  const removed = await (Expense.findByIdAndDelete as any)(params.id);
  if (!removed) return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

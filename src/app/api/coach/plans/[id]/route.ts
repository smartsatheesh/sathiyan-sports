import { NextRequest, NextResponse } from 'next/server';
import { loadPlan } from '@/app/lib/coachAccess.server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { doc, error } = await loadPlan(params.id);
  if (error) return error;
  return NextResponse.json({
    success: true,
    plan: {
      _id: doc._id,
      inputs: doc.inputs,
      plan: doc.plan,
      progress: Object.fromEntries(doc.progress || []),
      chat: doc.chat,
      createdAt: doc.createdAt,
    },
  });
}

// PATCH { key, done } ticks an exercise on/off
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { doc, error } = await loadPlan(params.id);
  if (error) return error;
  const { key, done } = await request.json();
  if (!/^\d{1,2}-\d{1,2}-\d{1,2}$/.test(String(key))) {
    return NextResponse.json({ success: false, error: 'Invalid item' }, { status: 400 });
  }
  if (done) doc.progress.set(key, true);
  else doc.progress.delete(key);
  await doc.save();
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { doc, error } = await loadPlan(params.id);
  if (error) return error;
  await doc.deleteOne();
  return NextResponse.json({ success: true });
}

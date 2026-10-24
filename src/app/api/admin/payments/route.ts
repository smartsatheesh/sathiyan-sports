import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Payment from '@/app/models/Payment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToMongoose();
    const status = request.nextUrl.searchParams.get('status') || 'submitted';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200);

    const query = ['submitted', 'confirmed', 'rejected'].includes(status) ? { status } : {};
    const [payments, pendingCount] = await Promise.all([
      (Payment.find as any)(query).sort({ createdAt: -1 }).limit(limit).lean(),
      (Payment.countDocuments as any)({ status: 'submitted' }),
    ]);

    return NextResponse.json({ success: true, payments, pendingCount });
  } catch (error) {
    console.error('Failed to list payments:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payments' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Expense from '@/app/models/Expense';
import { getMonthReport, parseExpense } from '@/app/lib/expenses.server';

export const dynamic = 'force-dynamic';

// GET ?month=YYYY-MM → that month's expenses + summary (totals, income, net)
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month') || '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ success: false, error: 'month must be YYYY-MM' }, { status: 400 });
  }
  try {
    await connectToMongoose();
    const report = await getMonthReport(month);
    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error('Expense report failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  const [data, error] = await parseExpense({ ...(await request.json()), allowLegacy: false });
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  await connectToMongoose();
  const expense = await (Expense.create as any)({ ...data, createdBy: session.user.id });
  return NextResponse.json({ success: true, expense });
}

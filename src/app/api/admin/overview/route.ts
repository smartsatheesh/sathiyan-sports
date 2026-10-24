import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import Payment from '@/app/models/Payment';
import User from '@/app/models/User';
import { getISTDayRange } from '@/app/lib/istDate';
import { getFeeBoard } from '@/app/lib/fees.server';
import { getMonthReport } from '@/app/lib/expenses.server';

export const dynamic = 'force-dynamic';

// Numbers for the admin home screen
export async function GET() {
  try {
    await connectToMongoose();
    const now = new Date();
    const { dayStart, dayEnd } = getISTDayRange(now);
    const istNow = new Date(now.getTime() + 330 * 60 * 1000);
    const month = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}`;

    const [todaysBookings, pendingBookings, paymentsToVerify, resetRequests, fees, report] = await Promise.all([
      (Booking.countDocuments as any)({ date: { $gte: dayStart, $lte: dayEnd }, bookingStatus: { $ne: 'cancelled' } }),
      (Booking.countDocuments as any)({ bookingStatus: 'pending', date: { $gte: dayStart } }),
      (Payment.countDocuments as any)({ status: 'submitted' }),
      (User.countDocuments as any)({ resetRequestedAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
      getFeeBoard(),
      getMonthReport(month),
    ]);

    const overdue = fees.members.filter((m) => m.state === 'overdue' || m.state === 'never_paid');
    return NextResponse.json({
      success: true,
      todaysBookings,
      pendingBookings,
      paymentsToVerify,
      resetRequests,
      feesOverdue: { count: overdue.length, amount: overdue.reduce((s, m) => s + m.monthlyFee, 0) },
      feesDueThisWeek: fees.members.filter((m) => m.state === 'due_soon').length,
      month: { moneyIn: report.summary.income.total, spent: report.summary.total, net: report.summary.net },
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load overview' }, { status: 500 });
  }
}

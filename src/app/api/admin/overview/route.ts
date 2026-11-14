import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import Payment from '@/app/models/Payment';
import User from '@/app/models/User';
import Review from '@/app/models/Review';
import { getISTDayRange } from '@/app/lib/istDate';
import { getFeeBoard } from '@/app/lib/fees.server';
import { getMonthReport } from '@/app/lib/expenses.server';
import { canSeeMoney, hasAdminArea } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';

export const dynamic = 'force-dynamic';

// Numbers for the admin home screen. A coach gets only the booking counts — no money.
export async function GET() {
  try {
    const auth = await requireRole(hasAdminArea);
    if (!auth.ok) return auth.response;

    await connectToMongoose();
    const now = new Date();
    const { dayStart, dayEnd } = getISTDayRange(now);

    const [todaysBookings, pendingBookings] = await Promise.all([
      (Booking.countDocuments as any)({ date: { $gte: dayStart, $lte: dayEnd }, bookingStatus: { $ne: 'cancelled' } }),
      (Booking.countDocuments as any)({ bookingStatus: 'pending', date: { $gte: dayStart } }),
    ]);

    if (!canSeeMoney(auth.role)) {
      return NextResponse.json({ success: true, todaysBookings, pendingBookings, money: false });
    }

    const istNow = new Date(now.getTime() + 330 * 60 * 1000);
    const month = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}`;

    const [paymentsToVerify, resetRequests, pendingReviews, fees, report] = await Promise.all([
      (Payment.countDocuments as any)({ status: 'submitted' }),
      (User.countDocuments as any)({ resetRequestedAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
      (Review.countDocuments as any)({ status: 'pending' }),
      getFeeBoard(),
      getMonthReport(month),
    ]);

    const overdue = fees.members.filter((m) => m.state === 'overdue' || m.state === 'never_paid');
    return NextResponse.json({
      success: true,
      money: true,
      todaysBookings,
      pendingBookings,
      paymentsToVerify,
      resetRequests,
      pendingReviews,
      feesOverdue: { count: overdue.length, amount: overdue.reduce((s, m) => s + m.monthlyFee, 0) },
      feesDueThisWeek: fees.members.filter((m) => m.state === 'due_soon').length,
      month: { moneyIn: report.summary.income.total, spent: report.summary.total, net: report.summary.net },
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load overview' }, { status: 500 });
  }
}

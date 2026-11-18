import { NextResponse } from 'next/server';
import { isOwner } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { syncCustomers } from '@/app/lib/customers.server';
import Customer from '@/app/models/Customer';

export const dynamic = 'force-dynamic';

/** Owner: every booking customer with their booking figures (synced from bookings first). */
export async function GET() {
  const auth = await requireRole(isOwner);
  if (!auth.ok) return auth.response;
  try {
    const stats = await syncCustomers();
    const docs = await (Customer.find as any)({}).select('mobile name email showOnLeaderboard notes updatedAt photo').lean();
    const customers = docs
      .map((d: any) => {
        const s = stats.get(d.mobile);
        return {
          id: String(d._id),
          mobile: d.mobile,
          name: d.name || s?.name || '',
          email: d.email || s?.email || '',
          showOnLeaderboard: d.showOnLeaderboard !== false,
          notes: d.notes || '',
          photoUrl: d.photo ? `/api/customers/${d._id}/photo?v=${new Date(d.updatedAt || 0).getTime()}` : null,
          bookings: s?.bookings || 0,
          cancelled: s?.cancelled || 0,
          last30: s?.last30 || 0,
          thisWeek: s?.thisWeek || 0,
          spent: s?.spent || 0,
          firstAt: s?.firstAt || null,
          lastAt: s?.lastAt || null,
          favouriteSport: s?.favouriteSport || '',
        };
      })
      .sort((a: any, b: any) => b.bookings - a.bookings || (new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()));
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Customers list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load customers' }, { status: 500 });
  }
}

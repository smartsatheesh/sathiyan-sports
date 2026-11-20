import { NextResponse } from 'next/server';
import { canManageFinance, canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { getFinanceOverview } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// Today's collection book: who is due, who is late. The owner also gets the money totals.
export async function GET() {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  try {
    const overview = await getFinanceOverview(canManageFinance(auth.role));
    return NextResponse.json({ success: true, ...overview });
  } catch (error) {
    console.error('Finance overview failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load the finance book' }, { status: 500 });
  }
}

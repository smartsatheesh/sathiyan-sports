import { NextRequest, NextResponse } from 'next/server';
import { canManageFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { getFinanceReport, getMonthEntries } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// GET ?year=YYYY   → twelve months of given / collected / interest, plus today's book
// GET ?month=YYYY-MM → that month's ledger rows
// Owner only: this is the revenue view.
export async function GET(request: NextRequest) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const year = request.nextUrl.searchParams.get('year') || '';
  const month = request.nextUrl.searchParams.get('month') || '';
  try {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ success: true, month, entries: await getMonthEntries(month) });
    }
    if (!/^20\d{2}$/.test(year)) {
      return NextResponse.json({ success: false, error: 'year must be YYYY or month YYYY-MM' }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...(await getFinanceReport(Number(year))) });
  } catch (error) {
    console.error('Finance report failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load the report' }, { status: 500 });
  }
}

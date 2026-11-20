import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { lookupCustomer, searchCustomers } from '@/app/lib/customers.server';

/** Staff only: prefill a returning customer at the desk — `?q=` suggests by name or mobile
 *  prefix while typing, `?mobile=` fetches one customer by full mobile. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(isStaff);
  if (!auth.ok) return auth.response;
  try {
    const q = request.nextUrl.searchParams.get('q');
    if (q !== null) {
      const customers = await searchCustomers(q);
      return NextResponse.json({ success: true, customers });
    }
    const customer = await lookupCustomer(request.nextUrl.searchParams.get('mobile') || '');
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

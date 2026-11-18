import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { lookupCustomer } from '@/app/lib/customers.server';

/** Staff only: prefill a returning customer's details at the desk from their mobile. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(isStaff);
  if (!auth.ok) return auth.response;
  try {
    const customer = await lookupCustomer(request.nextUrl.searchParams.get('mobile') || '');
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

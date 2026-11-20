import { NextRequest, NextResponse } from 'next/server';
import { canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { createBorrower, listBorrowers } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// People Sathiyan Finance lends to. Staff and owner can list and add.
export async function GET(request: NextRequest) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const q = request.nextUrl.searchParams.get('q') || '';
  return NextResponse.json({ success: true, borrowers: await listBorrowers(q) });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const [borrower, error] = await createBorrower(body, auth.userId);
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });
  return NextResponse.json({ success: true, borrower });
}

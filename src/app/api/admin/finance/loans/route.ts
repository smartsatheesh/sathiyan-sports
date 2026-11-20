import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { createLoan, listLoans, LoanFilter } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// GET ?status=active|closed|overdue|due_today|all &q=name/number/loan no &borrowerId=
export async function GET(request: NextRequest) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const p = request.nextUrl.searchParams;
  const status = (p.get('status') || 'active') as LoanFilter['status'];
  if (!['active', 'closed', 'overdue', 'due_today', 'all'].includes(String(status))) {
    return NextResponse.json({ success: false, error: 'Unknown status filter' }, { status: 400 });
  }
  const loans = await listLoans({ status, q: p.get('q') || '', borrowerId: p.get('borrowerId') || '' });
  return NextResponse.json({ success: true, loans });
}

// Give a loan: staff and owner. Creates the loan and its "given" ledger row.
export async function POST(request: NextRequest) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => null);
  const [loan, error] = await createLoan(body, { id: auth.userId, name: session?.user?.name || '' });
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });
  return NextResponse.json({ success: true, loan });
}

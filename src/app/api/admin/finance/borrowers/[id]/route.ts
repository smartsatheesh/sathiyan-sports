import { NextRequest, NextResponse } from 'next/server';
import { canManageFinance, canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { deleteBorrower, listLoans, updateBorrower } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// A borrower's details (staff may correct a name or number) and their loans; deleting is the owner's.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const loans = await listLoans({ status: 'all', borrowerId: params.id });
  return NextResponse.json({ success: true, loans });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const [borrower, error] = await updateBorrower(params.id, body);
  if (error) return NextResponse.json({ success: false, error }, { status: error === 'Borrower not found' ? 404 : 400 });
  return NextResponse.json({ success: true, borrower });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const error = await deleteBorrower(params.id);
  if (error) return NextResponse.json({ success: false, error }, { status: error === 'Borrower not found' ? 404 : 400 });
  return NextResponse.json({ success: true });
}

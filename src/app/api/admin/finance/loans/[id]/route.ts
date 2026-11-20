import { NextRequest, NextResponse } from 'next/server';
import { canManageFinance, canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { deleteLoan, getLoanDetail, updateLoan } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// One loan with its ledger and WhatsApp links (staff and owner); edits and deletes are the owner's.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const detail = await getLoanDetail(params.id);
  if (!detail) return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
  return NextResponse.json({ success: true, ...detail });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Nothing to change' }, { status: 400 });
  const [loan, error] = await updateLoan(params.id, body, auth.userId);
  if (error) return NextResponse.json({ success: false, error }, { status: error === 'Loan not found' ? 404 : 400 });
  return NextResponse.json({ success: true, loan });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const error = await deleteLoan(params.id);
  if (error) return NextResponse.json({ success: false, error }, { status: 404 });
  return NextResponse.json({ success: true });
}

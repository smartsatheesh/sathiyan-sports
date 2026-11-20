import { NextRequest, NextResponse } from 'next/server';
import { canManageFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { deleteEntry } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// Remove a wrongly keyed ledger row (the loan totals are recomputed). Owner only.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const error = await deleteEntry(params.id);
  if (error) return NextResponse.json({ success: false, error }, { status: error === 'Entry not found' ? 404 : 400 });
  return NextResponse.json({ success: true });
}

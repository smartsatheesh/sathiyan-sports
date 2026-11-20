import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { canUseFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { addEntry } from '@/app/lib/finance.server';

export const dynamic = 'force-dynamic';

// Record money received on a loan (instalment, interest, principal back, penalty). Staff and owner.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(canUseFinance);
  if (!auth.ok) return auth.response;
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => null);
  const [result, error] = await addEntry(params.id, body, { id: auth.userId, name: session?.user?.name || '' });
  if (error) return NextResponse.json({ success: false, error }, { status: error === 'Loan not found' ? 404 : 400 });
  return NextResponse.json({ success: true, ...result });
}

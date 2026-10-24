import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { getMemberFeeSummary, payTokenFor } from '@/app/lib/fees.server';

export const dynamic = 'force-dynamic';

// Signed-in member's own fee status, with their pay-page token
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }
  const summary = await getMemberFeeSummary(session.user.id);
  if (!summary) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
  return NextResponse.json({ success: true, summary, payToken: payTokenFor(session.user.id) });
}

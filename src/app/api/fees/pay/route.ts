import { NextRequest, NextResponse } from 'next/server';
import { getMemberFeeSummary, submitMemberFee, userIdFromPayToken } from '@/app/lib/fees.server';
import { PaymentError } from '@/app/lib/payments.server';

export const dynamic = 'force-dynamic';

// Public, but only with a signed pay link (sent by the academy on WhatsApp)
export async function GET(request: NextRequest) {
  const userId = userIdFromPayToken(request.nextUrl.searchParams.get('t') || '');
  if (!userId) return NextResponse.json({ success: false, error: 'This payment link is not valid' }, { status: 404 });

  const summary = await getMemberFeeSummary(userId);
  if (!summary) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
  return NextResponse.json({ success: true, summary });
}

export async function POST(request: NextRequest) {
  try {
    const { t, months, utr } = await request.json();
    const userId = userIdFromPayToken(t);
    if (!userId) return NextResponse.json({ success: false, error: 'This payment link is not valid' }, { status: 404 });
    if (![1, 3, 6, 12].includes(Number(months))) {
      return NextResponse.json({ success: false, error: 'Choose a plan' }, { status: 400 });
    }

    const payment = await submitMemberFee(userId, Number(months), String(utr || ''));
    return NextResponse.json({ success: true, payment: { amount: payment.amount, status: payment.status } });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Member fee submission failed:', error);
    return NextResponse.json({ success: false, error: 'Could not submit payment. Please try again.' }, { status: 500 });
  }
}

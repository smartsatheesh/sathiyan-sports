import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { submitPaymentProof, PaymentError, PaymentKind } from '@/app/lib/payments.server';

const KINDS: PaymentKind[] = ['booking', 'subscription', 'tournament'];

// Public: customer submits the UPI reference (UTR) after paying. Amount is taken from the record.
export async function POST(request: NextRequest) {
  try {
    const { kind, refId, utr } = await request.json();

    if (!KINDS.includes(kind) || !mongoose.isValidObjectId(refId)) {
      return NextResponse.json({ success: false, error: 'Invalid payment request' }, { status: 400 });
    }

    const payment = await submitPaymentProof(kind, refId, String(utr || ''));
    return NextResponse.json({
      success: true,
      message: 'Payment submitted. We will confirm it shortly.',
      payment: { id: payment._id, amount: payment.amount, status: payment.status },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Payment proof submission failed:', error);
    return NextResponse.json({ success: false, error: 'Could not submit payment. Please try again.' }, { status: 500 });
  }
}

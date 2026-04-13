import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import FeeCollection from '@/app/models/FeeCollection';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethod, transactionId, paidDate, notes } = body;
    const { id } = params;

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    await connectToMongoose();

    const updatedFee = await (FeeCollection.findByIdAndUpdate as any)(
      id,
      {
        status: 'paid',
        paymentMethod,
        transactionId,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        notes: notes ? `${notes}\n\nPayment recorded by ${session.user.name} on ${new Date().toLocaleString()}` : `Payment recorded by ${session.user.name} on ${new Date().toLocaleString()}`,
        updatedBy: {
          name: session.user.name,
          email: session.user.email
        }
      },
      { new: true }
    );

    if (!updatedFee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      fee: updatedFee
    });

  } catch (error) {
    console.error('Fee payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
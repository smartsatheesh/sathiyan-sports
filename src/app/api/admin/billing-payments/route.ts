import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/app/services/billingService';
import { BillingCycle } from '@/app/models/BillingCycleModel';
import { connectToMongoose } from '@/app/server/mongodb';

/**
 * POST - Process payment for billing cycle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      billingCycleId,
      paymentId,
      amount,
      paymentMethod,
      status,
      transactionId,
      notes
    } = body;

    // Validate required fields
    if (!billingCycleId || !paymentId || !amount || !paymentMethod || !status) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    const paymentData = {
      paymentId,
      amount,
      paymentMethod,
      status,
      transactionId,
      notes
    };

    const updatedBillingCycle = await BillingService.processPayment(billingCycleId, paymentData);

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      data: updatedBillingCycle
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process payment'
    }, { status: 500 });
  }
}

/**
 * GET - Get payment history for a billing cycle
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billingCycleId = searchParams.get('billingCycleId');
    const userId = searchParams.get('userId');

    if (!billingCycleId && !userId) {
      return NextResponse.json({
        success: false,
        message: 'Either billingCycleId or userId is required'
      }, { status: 400 });
    }

    await connectToMongoose();

    let billingCycle;
    if (billingCycleId) {
      billingCycle = await (BillingCycle.findById as any)(billingCycleId);
    } else {
      billingCycle = await (BillingCycle.findOne as any)({ userId });
    }

    if (!billingCycle) {
      return NextResponse.json({
        success: false,
        message: 'Billing cycle not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        billingCycle,
        paymentHistory: billingCycle.paymentHistory || []
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch payment history'
    }, { status: 500 });
  }
}
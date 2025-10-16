import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/app/services/billingService';

/**
 * GET - Get billing analytics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const analytics = await BillingService.getBillingAnalytics();
    
    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching billing analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch billing analytics'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/app/services/billingService';
import { BillingCycle, BillingReminder } from '@/app/models/BillingCycleModel';
import { connectToMongoose } from '@/app/server/mongodb';

/**
 * GET - Get all billing cycles (Admin Dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const cycleType = searchParams.get('cycleType');
    const search = searchParams.get('search');

    await connectToMongoose();

    // Build filter query
    const filter: any = {};
    if (status) filter.status = status;
    if (cycleType) filter.cycleType = cycleType;
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [billingCycles, totalCount] = await Promise.all([
      (BillingCycle.find as any)(filter)
        .sort({ nextBillingDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      (BillingCycle.countDocuments as any)(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: billingCycles,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching billing cycles:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch billing cycles'
    }, { status: 500 });
  }
}

/**
 * POST - Create new billing cycle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userEmail,
      userName,
      cycleType,
      billingDate,
      currentAmount,
      currency,
      reminderDays,
      notificationPreferences
    } = body;

    // Validate required fields
    if (!userId || !userEmail || !userName || !cycleType || !billingDate || !currentAmount) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate cycle type
    if (!['monthly', 'quarterly', 'half yearly', 'yearly'].includes(cycleType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid cycle type'
      }, { status: 400 });
    }

    // Validate billing date
    if (billingDate < 1 || billingDate > 28) {
      return NextResponse.json({
        success: false,
        message: 'Billing date must be between 1 and 28'
      }, { status: 400 });
    }

    const billingCycle = await BillingService.createOrUpdateBillingCycle({
      userId,
      userEmail,
      userName,
      cycleType,
      billingDate,
      currentAmount,
      currency: currency || 'INR',
      reminderDays: reminderDays || [7, 3, 1],
      notificationPreferences: notificationPreferences || {
        email: true,
        whatsapp: true,
        sms: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Billing cycle created successfully',
      data: billingCycle
    });

  } catch (error) {
    console.error('Error creating billing cycle:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create billing cycle'
    }, { status: 500 });
  }
}

/**
 * PUT - Update billing cycle
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { billingCycleId, ...updates } = body;

    if (!billingCycleId) {
      return NextResponse.json({
        success: false,
        message: 'Billing cycle ID is required'
      }, { status: 400 });
    }

    const updatedBillingCycle = await BillingService.updateBillingCycle(billingCycleId, updates);

    if (!updatedBillingCycle) {
      return NextResponse.json({
        success: false,
        message: 'Billing cycle not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Billing cycle updated successfully',
      data: updatedBillingCycle
    });

  } catch (error) {
    console.error('Error updating billing cycle:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update billing cycle'
    }, { status: 500 });
  }
}

/**
 * DELETE - Cancel billing cycle
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billingCycleId = searchParams.get('id');

    if (!billingCycleId) {
      return NextResponse.json({
        success: false,
        message: 'Billing cycle ID is required'
      }, { status: 400 });
    }

    await connectToMongoose();

    const billingCycle = await (BillingCycle.findByIdAndUpdate as any)(
      billingCycleId,
      { 
        status: 'cancelled',
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!billingCycle) {
      return NextResponse.json({
        success: false,
        message: 'Billing cycle not found'
      }, { status: 404 });
    }

    // Cancel pending reminders
    await (BillingReminder.updateMany as any)(
      { 
        billingCycleId: billingCycleId,
        status: 'pending'
      },
      { status: 'cancelled' }
    );

    return NextResponse.json({
      success: true,
      message: 'Billing cycle cancelled successfully',
      data: billingCycle
    });

  } catch (error) {
    console.error('Error cancelling billing cycle:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel billing cycle'
    }, { status: 500 });
  }
}
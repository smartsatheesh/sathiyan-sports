import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/app/services/billingService';
import { BillingReminder } from '@/app/models/BillingCycleModel';
import { connectToMongoose } from '@/app/server/mongodb';

/**
 * GET - Get billing reminders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const pending = searchParams.get('pending') === 'true';

    await connectToMongoose();

    let query: any = {};
    
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    if (pending) {
      // Get today's pending reminders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.status = 'pending';
      query.scheduledDate = { $gte: today, $lt: tomorrow };
    }

    const reminders = await (BillingReminder.find as any)(query)
      .populate('billingCycleId')
      .sort({ scheduledDate: 1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch reminders'
    }, { status: 500 });
  }
}

/**
 * POST - Send reminder manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reminderId, sentVia } = body;

    if (!reminderId || !sentVia) {
      return NextResponse.json({
        success: false,
        message: 'Reminder ID and sentVia are required'
      }, { status: 400 });
    }

    const updatedReminder = await BillingService.markReminderSent(reminderId, sentVia);

    if (!updatedReminder) {
      return NextResponse.json({
        success: false,
        message: 'Reminder not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder marked as sent',
      data: updatedReminder
    });

  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update reminder'
    }, { status: 500 });
  }
}

/**
 * PUT - Update reminder status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { reminderId, status, notes } = body;

    if (!reminderId || !status) {
      return NextResponse.json({
        success: false,
        message: 'Reminder ID and status are required'
      }, { status: 400 });
    }

    await connectToMongoose();

    const updateData: any = { status };
    if (status === 'sent') {
      updateData.sentAt = new Date();
    }
    if (notes) {
      updateData.notes = notes;
    }

    const updatedReminder = await (BillingReminder.findByIdAndUpdate as any)(
      reminderId,
      updateData,
      { new: true }
    );

    if (!updatedReminder) {
      return NextResponse.json({
        success: false,
        message: 'Reminder not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder updated successfully',
      data: updatedReminder
    });

  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update reminder'
    }, { status: 500 });
  }
}
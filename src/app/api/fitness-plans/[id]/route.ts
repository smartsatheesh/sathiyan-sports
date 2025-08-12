import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/Mongo';
import FitnessEnrollment from '@/app/models/FitnessEnrollment';

// GET - Fetch enrollment details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const enrollmentId = params.id;
    const enrollment = await (FitnessEnrollment.findOne as any)({ enrollmentId });
    
    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment
    });

  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch enrollment details'
    }, { status: 500 });
  }
}

// PATCH - Update enrollment (progress, payment status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const enrollmentId = params.id;
    const body = await request.json();
    
    const enrollment = await (FitnessEnrollment.findOne as any)({ enrollmentId });
    
    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment not found'
      }, { status: 404 });
    }

    // Update allowed fields
    const allowedUpdates = [
      'status',
      'paymentStatus',
      'completedDays',
      'currentWeek',
      'paymentMethod',
      'paymentReference',
      'upiTransactionId',
      'phonepeTransactionId',
      'notes',
      'trainerAssigned',
      'startDate'
    ];

    // Apply updates
    Object.keys(body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        enrollment[key] = body[key];
      }
    });

    // If updating completed days, recalculate progress
    if (body.completedDays !== undefined) {
      enrollment.progressPercentage = Math.round((body.completedDays / enrollment.totalDays) * 100);
      enrollment.lastProgressUpdate = new Date();
      
      // Auto-complete if 100% done
      if (enrollment.progressPercentage >= 100) {
        enrollment.status = 'completed';
        enrollment.endDate = new Date();
      }
    }

    // If payment is completed, activate the plan
    if (body.paymentStatus === 'completed' && enrollment.status === 'pending') {
      enrollment.status = 'active';
      enrollment.startDate = new Date();
    }

    await enrollment.save();

    return NextResponse.json({
      success: true,
      message: 'Enrollment updated successfully',
      enrollment
    });

  } catch (error) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update enrollment'
    }, { status: 500 });
  }
}

// DELETE - Cancel enrollment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const enrollmentId = params.id;
    const enrollment = await (FitnessEnrollment.findOne as any)({ enrollmentId });
    
    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment not found'
      }, { status: 404 });
    }

    // Update status to cancelled instead of deleting
    enrollment.status = 'cancelled';
    await enrollment.save();

    return NextResponse.json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling enrollment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel enrollment'
    }, { status: 500 });
  }
}

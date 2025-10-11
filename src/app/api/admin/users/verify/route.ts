import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
import { connectToMongoose } from "@/app/server/mongodb";
import User from '@/app/models/User';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized. Admin access required.' 
      }, { status: 401 });
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID and action are required' 
      }, { status: 400 });
    }

    // Validate action
    if (!['verify', 'reject', 'suspend'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid action. Must be verify, reject, or suspend' 
      }, { status: 400 });
    }

    // Update user status
    const updatedUser = await (User.findByIdAndUpdate as any)(
      userId,
      { 
        status: action === 'verify' ? 'verified' : action === 'reject' ? 'rejected' : 'suspended',
        verifiedAt: action === 'verify' ? new Date() : undefined,
        verifiedBy: action === 'verify' ? session.user.id : undefined,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${action}ed successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

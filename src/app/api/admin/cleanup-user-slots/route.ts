import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectToMongoose();
    console.log('🔧 Starting user slots cleanup...');

    // Update all existing users to have preferred slots as "-"
    const result = await (User.updateMany as any)(
      {}, // Update all users
      {
        $set: {
          preferredTimeSlot: "-",
          selectedCourt: "-"
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with default slot values`);
    
    // Mark all users as active with completed payment (legacy migration)
    const paymentResult = await (User.updateMany as any)(
      { paymentStatus: { $exists: false } },
      {
        $set: {
          paymentStatus: "completed",
          isActive: true
        }
      }
    );

    console.log(`✅ Updated ${paymentResult.modifiedCount} users with payment status`);
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully!',
      slotsUpdated: result.modifiedCount,
      paymentStatusUpdated: paymentResult.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    }, { status: 500 });
  }
}
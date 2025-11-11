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
    
    // Also update status to "registered" for existing users
    const statusResult = await (User.updateMany as any)(
      { status: { $in: ['pending', 'verified'] } },
      {
        $set: {
          status: "registered",
          paymentStatus: "completed"
        }
      }
    );

    console.log(`✅ Updated ${statusResult.modifiedCount} users to registered status`);
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully!',
      slotsUpdated: result.modifiedCount,
      statusUpdated: statusResult.modifiedCount
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
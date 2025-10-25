import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";

// This is a simple configuration endpoint
// In a real application, you might want to store this in a database
export async function POST(req: NextRequest) {
  try {
    await connectToMongoose();
    const { courts } = await req.json();

    if (!courts || !Array.isArray(courts)) {
      return NextResponse.json(
        { success: false, message: "Courts configuration is required" },
        { status: 400 }
      );
    }

    // Validate court configuration
    for (const court of courts) {
      if (!court.courtId || !court.name || typeof court.maxCapacity !== 'number') {
        return NextResponse.json(
          { success: false, message: "Invalid court configuration" },
          { status: 400 }
        );
      }
      
      if (court.maxCapacity < 1 || court.maxCapacity > 10) {
        return NextResponse.json(
          { success: false, message: "Court capacity must be between 1 and 10" },
          { status: 400 }
        );
      }
    }

    // For now, we'll just validate and return success
    // In a real implementation, you would save this to a database
    console.log('💾 Court configuration updated:', courts);

    return NextResponse.json({
      success: true,
      message: "Court configuration updated successfully",
      courts: courts
    });

  } catch (error) {
    console.error('Error updating court configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating court configuration. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Return default court configuration
    const defaultCourtConfig = [
      { courtId: 'S1', name: 'Court S1', maxCapacity: 4, isActive: true },
      { courtId: 'S2', name: 'Court S2', maxCapacity: 4, isActive: true },
      { courtId: 'S3', name: 'Court S3', maxCapacity: 4, isActive: true },
    ];

    return NextResponse.json({
      success: true,
      courts: defaultCourtConfig
    });

  } catch (error) {
    console.error('Error fetching court configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching court configuration. Please try again.',
        courts: []
      },
      { status: 500 }
    );
  }
}
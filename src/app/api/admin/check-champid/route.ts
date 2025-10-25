import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authConfig";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin access
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await connectToMongoose();
    const adminUser = await (User as any).findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const champId = searchParams.get('champId');
    const currentUserId = searchParams.get('currentUserId');

    if (!champId) {
      return NextResponse.json({ 
        success: false, 
        message: 'ChampID is required' 
      }, { status: 400 });
    }

    // Build query to check if ChampID exists
    const query: any = { champId };
    
    // Exclude current user if provided (for edit scenarios)
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    const existingUser = await (User as any).findOne(query);

    return NextResponse.json({
      success: true,
      available: !existingUser,
      message: existingUser ? 'ChampID is already taken' : 'ChampID is available',
      champId
    });

  } catch (error) {
    console.error("Error checking ChampID availability:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Error checking ChampID availability", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "../../../../models/User";
import Booking from "../../../../models/Booking";

// GET - Fetch a specific user
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectToMongoose();

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required", success: false },
        { status: 400 }
      );
    }

    const user = await (User.findById as any)(userId).select("-password -__v");

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Error fetching user", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update a specific user
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectToMongoose();

    const { userId } = params;
    const body = await req.json();

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required", success: false },
        { status: 400 }
      );
    }

    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { password, _id, __v, ...updateData } = body;

    // Get current user data to check for changes that require validation
    const currentUser = await (User.findById as any)(userId);
    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    // Check if critical fields are being changed (sport, subscription type, court)
    const criticalFieldsChanged = 
      updateData.preferredSport !== currentUser.preferredSport ||
      updateData.subscriptionType !== currentUser.subscriptionType ||
      updateData.selectedCourt !== currentUser.selectedCourt;

    // If critical fields are being changed, check for existing bookings
    if (criticalFieldsChanged) {
      const existingBookings = await (Booking.find as any)({
        $or: [
          { customerEmail: currentUser.email },
          { customerPhone: currentUser.phone || currentUser.mobile }
        ],
        bookingStatus: { $in: ['pending', 'confirmed'] }
      });

      if (existingBookings.length > 0) {
        return NextResponse.json({
          message: "Cannot modify user details as they have existing bookings. Please cancel or complete their bookings first.",
          success: false,
          existingBookings: existingBookings.length
        }, { status: 400 });
      }
    }

    // Clean up selectedCourt - remove if empty string or if sport is not Shuttle Badminton
    if (updateData.selectedCourt === '' || updateData.preferredSport !== 'Shuttle Badminton') {
      delete updateData.selectedCourt;
    }

    const user = await (User.findByIdAndUpdate as any)(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Error updating user", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific user and their associated bookings
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectToMongoose();

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required", success: false },
        { status: 400 }
      );
    }

    // First, check if user exists
    const user = await (User.findById as any)(userId);
    
    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    // Delete all bookings associated with this user
    // We'll match by email and phone to catch all bookings
    const deletedBookings = await (Booking.deleteMany as any)({
      $or: [
        { customerEmail: user.email },
        { customerPhone: user.phone || user.mobile },
      ]
    });

    // Delete the user
    await (User.findByIdAndDelete as any)(userId);

    return NextResponse.json({
      success: true,
      message: `User deleted successfully. Also deleted ${deletedBookings.deletedCount} associated bookings.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Error deleting user", error: error instanceof Error ? error.message : "Unknown error", success: false },
      { status: 500 }
    );
  }
}
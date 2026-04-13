import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "../../../../../models/User";

// GET - Fetch a user's registered slots
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

    const user = await (User.findById as any)(userId).select("registeredSlots preferredSport selectedCourt subscriptionType status paymentStatus");

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      registeredSlots: user.registeredSlots || [],
      userInfo: {
        preferredSport: user.preferredSport,
        selectedCourt: user.selectedCourt,
        subscriptionType: user.subscriptionType,
        status: user.status,
        paymentStatus: user.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching user registered slots:", error);
    return NextResponse.json(
      { message: "Error fetching registered slots", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Add registered slots to a user
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectToMongoose();

    const { userId } = params;
    const body = await req.json();
    const { timeSlot, court, slots } = body;

    // Handle both single slot and multiple slots
    const slotsToAdd = slots || [{ timeSlot, court }];

    if (!userId || slotsToAdd.length === 0) {
      return NextResponse.json(
        { message: "User ID and slots are required", success: false },
        { status: 400 }
      );
    }

    // Validate all slots have required fields
    for (const slot of slotsToAdd) {
      if (!slot.timeSlot) {
        return NextResponse.json(
          { message: "All slots must have timeSlot", success: false },
          { status: 400 }
        );
      }
    }

    const user = await (User.findById as any)(userId);

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    // Check if user is eligible for registered slots
    if (!["monthly", "quarterly", "half yearly", "yearly"].includes(user.subscriptionType) || 
        !["completed", "confirmed"].includes(user.paymentStatus) ||
        !user.isActive) {
      return NextResponse.json(
        { message: "User is not eligible for registered slots. Must have active subscription with completed payment.", success: false },
        { status: 400 }
      );
    }

    // Process all slots and check for duplicates
    const newSlots = [];
    const duplicateSlots = [];

    for (const slotData of slotsToAdd) {
      const { timeSlot, court } = slotData;
      
      // Check if slot already exists
      const existingSlot = user.registeredSlots.find((slot: any) => 
        slot.timeSlot === timeSlot && 
        (!court || slot.court === court)
      );

      if (existingSlot) {
        duplicateSlots.push(`${timeSlot}`);
      } else {
        // Add the new registered slot
        const newSlot = {
          timeSlot,
          court: court || user.selectedCourt,
          registeredAt: new Date(),
        };
        newSlots.push(newSlot);
        user.registeredSlots.push(newSlot);
      }
    }

    await user.save();

    let message = `${newSlots.length} slot${newSlots.length !== 1 ? 's' : ''} added successfully`;
    if (duplicateSlots.length > 0) {
      message += `. ${duplicateSlots.length} duplicate slot${duplicateSlots.length !== 1 ? 's' : ''} skipped.`;
    }

    return NextResponse.json({
      success: true,
      message,
      registeredSlots: user.registeredSlots,
      addedCount: newSlots.length,
      duplicateCount: duplicateSlots.length,
    });
  } catch (error) {
    console.error("Error adding registered slot:", error);
    return NextResponse.json(
      { message: "Error adding registered slot", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a registered slot from a user
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectToMongoose();

    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");

    if (!userId || !slotId) {
      return NextResponse.json(
        { message: "User ID and slot ID are required", success: false },
        { status: 400 }
      );
    }

    const user = await (User.findById as any)(userId);

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }

    // Remove the registered slot
    user.registeredSlots = user.registeredSlots.filter((slot: any) => slot._id.toString() !== slotId);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Registered slot removed successfully",
      registeredSlots: user.registeredSlots,
    });
  } catch (error) {
    console.error("Error removing registered slot:", error);
    return NextResponse.json(
      { message: "Error removing registered slot", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
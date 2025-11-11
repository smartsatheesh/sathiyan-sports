import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "../../../../models/User";
import Booking from "../../../../models/Booking";
import Subscription from "../../../../models/Subscription";

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

    // Validate required champId field
    if (!updateData.champId || updateData.champId.trim() === '') {
      return NextResponse.json(
        { message: "ChampID is required for all users", success: false },
        { status: 400 }
      );
    }

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

    // Clean up paymentMethod - remove if empty string to avoid enum validation error
    if (updateData.paymentMethod === '') {
      delete updateData.paymentMethod;
    }

    // Clean up transactionId - remove if empty string
    if (updateData.transactionId === '') {
      delete updateData.transactionId;
    }

    // Check if payment status is changing to completed - set subscription dates
    const isPaymentCompleting = 
      updateData.paymentStatus === 'completed' && 
      currentUser.paymentStatus !== 'completed';

    // Check if user has completed payment but missing subscription dates
    const needsSubscriptionDates = 
      (updateData.paymentStatus === 'completed' || currentUser.paymentStatus === 'completed') &&
      currentUser.subscriptionType &&
      (!currentUser.nextDueDate || !currentUser.paymentCompletedDate);

    if ((isPaymentCompleting || needsSubscriptionDates) && currentUser.subscriptionType) {
      // Calculate subscription duration based on type
      const durationMap = {
        'monthly': 1,
        'quarterly': 3,
        'half yearly': 6,
        'yearly': 12
      };

      const duration = durationMap[currentUser.subscriptionType] || 1;
      
      // Set subscription start date to today (or keep existing if already set)
      const startDate = currentUser.subscriptionStartDate || new Date();
      
      // Calculate end date based on billing cycle if available
      let endDate;
      if (currentUser.billingCycleLength && currentUser.subscriptionType === 'monthly') {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + currentUser.billingCycleLength);
      } else {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + duration);
      }
      
      // Only set dates if they're missing
      if (!currentUser.subscriptionStartDate) updateData.subscriptionStartDate = startDate;
      if (!currentUser.subscriptionEndDate) updateData.subscriptionEndDate = endDate;
      if (!currentUser.nextDueDate) updateData.nextDueDate = endDate;
      if (!currentUser.paymentCompletedDate) updateData.paymentCompletedDate = new Date();
      if (!currentUser.hasActiveSubscription) updateData.hasActiveSubscription = true;
      
      // Assign court for badminton users upon payment completion
      if (currentUser.preferredSport === 'Shuttle Badminton' && !currentUser.selectedCourt && !updateData.selectedCourt) {
        updateData.selectedCourt = 'S1'; // Default court assignment
        console.log(`🏸 Assigned default court S1 to badminton player ${currentUser.name}`);
      }
      
      if (isPaymentCompleting) {
        console.log(`💳 Payment completed for ${currentUser.name}: Setting subscription dates from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      } else if (needsSubscriptionDates) {
        console.log(`📅 Setting missing subscription dates for ${currentUser.name}: from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      }
    }

    // Check if user is being verified and payment is completed - populate registered slots
    const shouldPopulateSlots = 
      updateData.status === 'verified' && 
      (updateData.paymentStatus === 'completed' || currentUser.paymentStatus === 'completed') &&
      currentUser.status !== 'verified' && // Only populate if status is changing to verified
      currentUser.preferredTimeSlot;

    if (shouldPopulateSlots) {
      // Parse preferredTimeSlot (e.g., "6:00 AM - 7:00 AM - S1")
      const timeSlotParts = currentUser.preferredTimeSlot.split(' - ');
      if (timeSlotParts.length >= 2) {
        const timeSlot = `${timeSlotParts[0]} - ${timeSlotParts[1]}`;
        const court = timeSlotParts[2] || currentUser.selectedCourt;
        
        // Create registered slots for all weekdays
        const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        updateData.registeredSlots = weekDays.map(day => ({
          timeSlot,
          dayOfWeek: day,
          court: currentUser.preferredSport === 'Shuttle Badminton' ? court : undefined,
          registeredAt: new Date()
        }));
      }
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

    // Create subscription entry after payment completion
    if ((isPaymentCompleting || needsSubscriptionDates) && currentUser.subscriptionType) {
      try {
        // Check if subscription already exists for this user
        const existingSubscription = await (Subscription.findOne as any)({ 
          userId: user._id 
        });

        if (!existingSubscription) {
          const durationMap = {
            'monthly': 1,
            'quarterly': 3,
            'half yearly': 6,
            'yearly': 12
          };

          const subscriptionData = {
            userId: user._id,
            champId: user.champId,
            userName: user.name,
            userEmail: user.email,
            userMobile: user.mobile,
            subscriptionType: currentUser.subscriptionType,
            mode: currentUser.mode || 'fixed',
            amount: currentUser.subscriptionAmount,
            duration: durationMap[currentUser.subscriptionType],
            startDate: updateData.subscriptionStartDate,
            endDate: updateData.subscriptionEndDate,
            nextDueDate: updateData.nextDueDate,
            paymentStatus: 'completed',
            status: 'active',
            preferredSport: currentUser.preferredSport,
            preferredTimeSlot: currentUser.preferredTimeSlot,
            selectedCourt: currentUser.selectedCourt,
            autoRenewal: false,
            createdBy: user._id
          };

          const subscription = await (Subscription.create as any)(subscriptionData);
          console.log(`✅ Subscription created for ${user.name}: ${subscription._id}`);
        } else {
          console.log(`ℹ️ Subscription already exists for ${user.name}`);
        }
      } catch (subscriptionError) {
        console.warn('⚠️ Failed to create subscription entry:', subscriptionError);
        // Don't fail the user update if subscription creation fails
      }
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
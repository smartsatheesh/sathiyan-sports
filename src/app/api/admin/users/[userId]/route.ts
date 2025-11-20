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
      // Calculate subscription duration based on type for subscription end date
      const durationMap = {
        'monthly': 1,
        'quarterly': 3,
        'half yearly': 6,
        'yearly': 12
      };

      const duration = durationMap[currentUser.subscriptionType] || 1;
      
      // Set subscription start date to today (or keep existing if already set)
      const startDate = currentUser.subscriptionStartDate || new Date();
      
      // Calculate subscription end date based on billing cycle if available
      let subscriptionEndDate;
      if (currentUser.billingCycleLength && currentUser.subscriptionType === 'monthly') {
        subscriptionEndDate = new Date(startDate);
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + currentUser.billingCycleLength);
      } else {
        subscriptionEndDate = new Date(startDate);
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + duration);
      }
      
      // Calculate next due date based on subscription type
      const paymentDate = updateData.paymentCompletedDate || new Date();
      let nextDueDate: Date;
      
      const subscriptionType = currentUser.subscriptionType || updateData.subscriptionType;
      
      switch (subscriptionType) {
        case 'monthly':
          // Next month, first day
          nextDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
          break;
        case 'quarterly':
          // Next quarter, first day of the month
          const currentQuarter = Math.floor(paymentDate.getMonth() / 3);
          const nextQuarterMonth = (currentQuarter + 1) * 3;
          if (nextQuarterMonth >= 12) {
            // Next year's first quarter
            nextDueDate = new Date(paymentDate.getFullYear() + 1, 0, 1); // January 1st of next year
          } else {
            nextDueDate = new Date(paymentDate.getFullYear(), nextQuarterMonth, 1);
          }
          break;
        case 'half yearly':
          // Next half year, first day of the month
          const currentHalf = Math.floor(paymentDate.getMonth() / 6);
          const nextHalfMonth = (currentHalf + 1) * 6;
          if (nextHalfMonth >= 12) {
            // Next year's first half
            nextDueDate = new Date(paymentDate.getFullYear() + 1, 0, 1); // January 1st of next year
          } else {
            nextDueDate = new Date(paymentDate.getFullYear(), nextHalfMonth, 1);
          }
          break;
        case 'yearly':
          // Next year, same month, first day
          nextDueDate = new Date(paymentDate.getFullYear() + 1, paymentDate.getMonth(), 1);
          break;
        default:
          // Default to monthly if no subscription type
          nextDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
      }
      
      console.log(`📅 Calculated due date for ${subscriptionType} subscription: ${nextDueDate.toDateString()}`);
      
      // Only set dates if they're missing or if manually updating nextDueDate is not provided
      if (!currentUser.subscriptionStartDate) updateData.subscriptionStartDate = startDate;
      if (!currentUser.subscriptionEndDate) updateData.subscriptionEndDate = subscriptionEndDate;
      if (!currentUser.nextDueDate && !updateData.nextDueDate) updateData.nextDueDate = nextDueDate;
      if (!currentUser.paymentCompletedDate) updateData.paymentCompletedDate = new Date();
      if (!currentUser.hasActiveSubscription) updateData.hasActiveSubscription = true;
      
      // Assign court for badminton users upon payment completion
      if (currentUser.preferredSport === 'Shuttle Badminton' && !currentUser.selectedCourt && !updateData.selectedCourt) {
        updateData.selectedCourt = 'S1'; // Default court assignment
        console.log(`🏸 Assigned default court S1 to badminton player ${currentUser.name}`);
      }
      
      if (isPaymentCompleting) {
        console.log(`💳 Payment completed for ${currentUser.name}: Setting subscription end date to ${subscriptionEndDate.toDateString()}, next due date to ${nextDueDate.toDateString()}`);
      } else if (needsSubscriptionDates) {
        console.log(`📅 Setting missing subscription dates for ${currentUser.name}: subscription end date ${subscriptionEndDate.toDateString()}, next due date ${nextDueDate.toDateString()}`);
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

    // Check if user subscription status is being set to 'Yes'
    const isBecomingSubscribed = 
      updateData.subscribed === 'Yes' && 
      currentUser.subscribed !== 'Yes';

    // Create subscription entry when: payment completing, missing dates, or becoming subscribed
    if (((isPaymentCompleting || needsSubscriptionDates || isBecomingSubscribed) && currentUser.subscriptionType) || 
        (isBecomingSubscribed && updateData.subscriptionType)) {
      try {
        // Check if subscription already exists for this user
        const existingSubscription = await (Subscription.findOne as any)({ 
          userId: user._id 
        });

        if (!existingSubscription) {
          // Use the updated subscription type if provided, or existing one
          const subscriptionType = updateData.subscriptionType || currentUser.subscriptionType;
          
          const durationMap = {
            'monthly': 1,
            'quarterly': 3,
            'half yearly': 6,
            'yearly': 12
          };

          // Determine payment status based on user's current status
          let subscriptionPaymentStatus = 'Pending'; // Default to pending
          if (updateData.paymentStatus === 'completed' || currentUser.paymentStatus === 'completed') {
            subscriptionPaymentStatus = 'Paid';
          } else if (updateData.paymentStatus === 'failed' || currentUser.paymentStatus === 'failed') {
            subscriptionPaymentStatus = 'Failed';
          }

          // Calculate subscription price if not already set
          const subscriptionAmount = updateData.subscriptionAmount || 
                                   currentUser.subscriptionAmount || 
                                   calculateSubscriptionAmount(
                                     updateData.champType || currentUser.champType,
                                     subscriptionType,
                                     updateData.gender || currentUser.gender,
                                     updateData.preferredTimeSlot || currentUser.preferredTimeSlot
                                   );

          // Set due date - if payment is pending, set to start of subscription
          let dueDate = updateData.nextDueDate || currentUser.nextDueDate;
          if (!dueDate) {
            if (subscriptionPaymentStatus === 'Pending') {
              // For pending payments, set due date to start date or today
              dueDate = updateData.subscriptionStartDate || new Date();
            } else {
              // For completed payments, calculate next due date
              const paymentDate = updateData.paymentCompletedDate || new Date();
              switch (subscriptionType) {
                case 'monthly':
                  dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
                  break;
                case 'quarterly':
                  const currentQuarter = Math.floor(paymentDate.getMonth() / 3);
                  const nextQuarterMonth = (currentQuarter + 1) * 3;
                  dueDate = nextQuarterMonth >= 12 ? 
                    new Date(paymentDate.getFullYear() + 1, 0, 1) : 
                    new Date(paymentDate.getFullYear(), nextQuarterMonth, 1);
                  break;
                case 'half yearly':
                  const currentHalf = Math.floor(paymentDate.getMonth() / 6);
                  const nextHalfMonth = (currentHalf + 1) * 6;
                  dueDate = nextHalfMonth >= 12 ? 
                    new Date(paymentDate.getFullYear() + 1, 0, 1) : 
                    new Date(paymentDate.getFullYear(), nextHalfMonth, 1);
                  break;
                case 'yearly':
                  dueDate = new Date(paymentDate.getFullYear() + 1, paymentDate.getMonth(), 1);
                  break;
                default:
                  dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
              }
            }
          }

          // Calculate overdue status
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateObj = new Date(dueDate);
          dueDateObj.setHours(0, 0, 0, 0);
          
          const diffTime = today.getTime() - dueDateObj.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const gracePeriod = updateData.gracePeriodDays || currentUser.gracePeriodDays || 7;
          
          const isOverdue = diffDays > 0 && subscriptionPaymentStatus !== 'Paid';
          const isPastGrace = diffDays > gracePeriod && subscriptionPaymentStatus !== 'Paid';
          const daysPastDue = Math.max(diffDays, 0);

          const subscriptionData = {
            userId: user._id,
            champId: updateData.champId || user.champId,
            userName: updateData.name || user.name,
            userEmail: updateData.email || user.email,
            userMobile: updateData.mobile || user.mobile,
            subscriptionType: subscriptionType,
            subscriptionPrice: subscriptionAmount,
            mode: updateData.mode || currentUser.mode || 'fixed',
            duration: durationMap[subscriptionType] || 1,
            startDate: updateData.subscriptionStartDate || currentUser.subscriptionStartDate || new Date(),
            endDate: updateData.subscriptionEndDate || currentUser.subscriptionEndDate,
            nextDueDate: dueDate,
            lastPaidDate: subscriptionPaymentStatus === 'Paid' ? 
              (updateData.paymentCompletedDate || currentUser.paymentCompletedDate || new Date()) : null,
            paymentStatus: subscriptionPaymentStatus,
            status: 'active',
            preferredSport: updateData.preferredSport || currentUser.preferredSport,
            preferredTimeSlot: updateData.preferredTimeSlot || currentUser.preferredTimeSlot,
            selectedCourt: updateData.selectedCourt || currentUser.selectedCourt,
            gracePeriod: gracePeriod,
            isOverdue: isOverdue,
            isPastGrace: isPastGrace,
            daysPastDue: daysPastDue,
            autoRenewal: false,
            createdBy: user._id,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const subscription = await (Subscription.create as any)(subscriptionData);
          console.log(`✅ Subscription created for ${user.name}: ${subscription._id} with payment status: ${subscriptionPaymentStatus}`);

          // Helper function to calculate subscription amount
          function calculateSubscriptionAmount(champType?: string, subscriptionType?: string, gender?: string, preferredTimeSlot?: string) {
            // Default pricing structure
            const ADULT_MALE_PRICING = {
              monthly: 1499,
              quarterly: 4299, 
              'half yearly': 8099,
              yearly: 11499
            };

            const ADULT_FEMALE_PRICING = {
              monthly: 1199,
              quarterly: 3599,
              'half yearly': 6899,
              yearly: 10999
            };

            const KIDS_PRICING = {
              monthly: 899,
              quarterly: 2399,
              'half yearly': 4599,
              yearly: 8999
            };

            // Helper function to check if time slot qualifies for female discount
            function isFemalDiscountTimeSlot(timeSlot: string): boolean {
              if (!timeSlot) return false;
              
              const startTime = timeSlot.split(' - ')[0];
              const [time, period] = startTime.split(' ');
              const [hours, minutes] = time.split(':').map(Number);
              
              let hour24 = hours;
              if (period === 'PM' && hours !== 12) hour24 += 12;
              if (period === 'AM' && hours === 12) hour24 = 0;
              
              const startHour = hour24 + minutes / 60;
              
              // Female discount applies from 10:00 AM (10.0) to 4:00 PM (16.0)
              return startHour >= 10.0 && startHour < 16.0;
            }

            // Determine pricing category
            if (champType === 'kids') {
              return KIDS_PRICING[subscriptionType || 'monthly'] || KIDS_PRICING.monthly;
            } else if (gender === 'female' && isFemalDiscountTimeSlot(preferredTimeSlot || '')) {
              return ADULT_FEMALE_PRICING[subscriptionType || 'monthly'] || ADULT_FEMALE_PRICING.monthly;
            } else {
              return ADULT_MALE_PRICING[subscriptionType || 'monthly'] || ADULT_MALE_PRICING.monthly;
            }
          }
        } else {
          console.log(`ℹ️ Subscription already exists for ${user.name}, updating with latest details...`);
          
          // Update existing subscription with latest user details and payment status
          const subscriptionType = updateData.subscriptionType || currentUser.subscriptionType;
          
          // Determine payment status
          let subscriptionPaymentStatus = existingSubscription.paymentStatus || 'Pending';
          if (updateData.paymentStatus === 'completed' || currentUser.paymentStatus === 'completed') {
            subscriptionPaymentStatus = 'Paid';
          } else if (updateData.paymentStatus === 'failed' || currentUser.paymentStatus === 'failed') {
            subscriptionPaymentStatus = 'Failed';
          } else if (updateData.paymentStatus === 'pending' || currentUser.paymentStatus === 'pending') {
            subscriptionPaymentStatus = 'Pending';
          }

          // Calculate overdue status
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextDueDate = updateData.nextDueDate || existingSubscription.nextDueDate;
          const dueDateObj = new Date(nextDueDate);
          dueDateObj.setHours(0, 0, 0, 0);
          
          const diffTime = today.getTime() - dueDateObj.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const gracePeriod = updateData.gracePeriodDays || currentUser.gracePeriodDays || existingSubscription.gracePeriod || 7;
          
          const isOverdue = diffDays > 0 && subscriptionPaymentStatus !== 'Paid';
          const isPastGrace = diffDays > gracePeriod && subscriptionPaymentStatus !== 'Paid';
          const daysPastDue = Math.max(diffDays, 0);

          const updateSubscriptionData = {
            champId: updateData.champId || user.champId,
            userName: updateData.name || user.name,
            userEmail: updateData.email || user.email,
            userMobile: updateData.mobile || user.mobile,
            subscriptionType: subscriptionType,
            paymentStatus: subscriptionPaymentStatus,
            lastPaidDate: subscriptionPaymentStatus === 'Paid' ? 
              (updateData.paymentCompletedDate || currentUser.paymentCompletedDate || existingSubscription.lastPaidDate) : 
              existingSubscription.lastPaidDate,
            nextDueDate: updateData.nextDueDate || existingSubscription.nextDueDate,
            preferredSport: updateData.preferredSport || currentUser.preferredSport,
            preferredTimeSlot: updateData.preferredTimeSlot || currentUser.preferredTimeSlot,
            selectedCourt: updateData.selectedCourt || currentUser.selectedCourt,
            gracePeriod: gracePeriod,
            isOverdue: isOverdue,
            isPastGrace: isPastGrace,
            daysPastDue: daysPastDue,
            updatedAt: new Date()
          };

          await (Subscription.findByIdAndUpdate as any)(existingSubscription._id, updateSubscriptionData);
          console.log(`✅ Subscription updated for ${user.name} with payment status: ${subscriptionPaymentStatus}, overdue: ${isOverdue}`);
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
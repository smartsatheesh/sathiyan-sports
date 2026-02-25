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
      
      // Calculate next due date based on subscription type - use LAST day of period
      const paymentDate = updateData.paymentCompletedDate || new Date();
      let nextDueDate: Date;
      
      const subscriptionType = currentUser.subscriptionType || updateData.subscriptionType;
      
      switch (subscriptionType) {
        case 'monthly':
          // Last day of current month
          nextDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0);
          break;
        case 'quarterly':
          // Last day of current quarter
          const currentQuarter = Math.floor(paymentDate.getMonth() / 3);
          const lastMonthOfQuarter = (currentQuarter + 1) * 3;
          nextDueDate = new Date(paymentDate.getFullYear(), lastMonthOfQuarter, 0);
          break;
        case 'half yearly':
          // Last day of current half-year
          const currentHalf = Math.floor(paymentDate.getMonth() / 6);
          const lastMonthOfHalf = (currentHalf + 1) * 6;
          nextDueDate = new Date(paymentDate.getFullYear(), lastMonthOfHalf, 0);
          break;
        case 'yearly':
          // Last day of current year (December 31)
          nextDueDate = new Date(paymentDate.getFullYear(), 11, 31);
          break;
        default:
          // Default to last day of current month if no subscription type
          nextDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0);
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

    // Check if user subscription status is being set to 'Yes' or 'yes'
    const isBecomingSubscribed = 
      (updateData.subscribed === 'Yes' || updateData.subscribed === 'yes') && 
      (currentUser.subscribed !== 'Yes' && currentUser.subscribed !== 'yes');

    // Check if user subscription status is being changed from 'Yes' to 'No'
    const isBecomingUnsubscribed = 
      (updateData.subscribed === 'No' || updateData.subscribed === 'no') && 
      (currentUser.subscribed === 'Yes' || currentUser.subscribed === 'yes');

    // Check if payment status is being changed from 'completed' to something else
    const isPaymentBecomingIncomplete = 
      updateData.paymentStatus && 
      updateData.paymentStatus !== 'completed' && 
      currentUser.paymentStatus === 'completed';

    // Delete subscription entry when user is unsubscribed or payment becomes incomplete
    const shouldDeleteSubscription = isBecomingUnsubscribed || isPaymentBecomingIncomplete;

    if (shouldDeleteSubscription) {
      try {
        const deletedSubscription = await (Subscription.findOneAndDelete as any)({ 
          userId: user._id 
        });
        
        if (deletedSubscription) {
          if (isBecomingUnsubscribed) {
            console.log(`🗑️ SUBSCRIPTION DELETED: User ${user.name} unsubscribed - removed subscription entry ${deletedSubscription._id}`);
          } else if (isPaymentBecomingIncomplete) {
            console.log(`🗑️ SUBSCRIPTION DELETED: Payment status for ${user.name} changed from completed to ${updateData.paymentStatus} - removed subscription entry ${deletedSubscription._id}`);
          }
        } else {
          console.log(`ℹ️ No subscription entry found to delete for user ${user.name}`);
        }
      } catch (deleteError) {
        console.error(`⚠️ Failed to delete subscription entry for ${user.name}:`, deleteError);
      }
    }

    // Check if user already has subscribed=yes but no subscription entry exists
    const hasSubscribedButNoEntry = 
      (updateData.subscribed === 'Yes' || updateData.subscribed === 'yes' || 
       currentUser.subscribed === 'Yes' || currentUser.subscribed === 'yes') &&
      !(await (Subscription.findOne as any)({ userId: userId }));

    // Check if pricing-related fields have changed that would affect subscription amount
    const pricingFieldsChanged = 
      updateData.champType !== currentUser.champType ||
      updateData.subscriptionType !== currentUser.subscriptionType ||
      updateData.gender !== currentUser.gender ||
      updateData.preferredTimeSlot !== currentUser.preferredTimeSlot;

    // Check if subscription-related fields have changed (for existing subscriptions)
    const subscriptionFieldsChanged = 
      updateData.nextDueDate !== undefined ||
      updateData.subscriptionStartDate !== undefined ||
      updateData.subscriptionEndDate !== undefined ||
      updateData.paymentCompletedDate !== undefined;

    // Create subscription entry when: payment completing, missing dates, becoming subscribed, or fixing missing entries
    // IMPORTANT: Always create subscription when user is marked as subscribed
    const shouldCreateSubscription = 
      !shouldDeleteSubscription && // Don't create if we're deleting
      (((isPaymentCompleting || needsSubscriptionDates || isBecomingSubscribed || hasSubscribedButNoEntry) && 
       (currentUser.subscriptionType || updateData.subscriptionType)) || 
      (isBecomingSubscribed || hasSubscribedButNoEntry)); // Always create when becoming subscribed or fixing missing entries

    // Check if existing subscription needs amount update
    const shouldUpdateSubscriptionAmount = 
      !shouldDeleteSubscription && 
      !shouldCreateSubscription && 
      pricingFieldsChanged &&
      (currentUser.subscribed === 'Yes' || currentUser.subscribed === 'yes');

    // Check if existing subscription needs general update (dates, etc.)
    const shouldUpdateSubscription = 
      !shouldDeleteSubscription && 
      !shouldCreateSubscription && 
      (subscriptionFieldsChanged || pricingFieldsChanged) &&
      (currentUser.subscribed === 'Yes' || currentUser.subscribed === 'yes');

    console.log(`🔍 Subscription check for user ${currentUser.name}:`, {
      isBecomingSubscribed,
      isBecomingUnsubscribed,
      isPaymentBecomingIncomplete,
      hasSubscribedButNoEntry, 
      shouldCreateSubscription,
      shouldDeleteSubscription,
      shouldUpdateSubscriptionAmount,
      shouldUpdateSubscription,
      subscriptionFieldsChanged,
      pricingFieldsChanged,
      currentSubscribed: currentUser.subscribed,
      updateSubscribed: updateData.subscribed,
      currentPaymentStatus: currentUser.paymentStatus,
      updatePaymentStatus: updateData.paymentStatus
    });

    let subscriptionCreated = false;

    if (shouldCreateSubscription) {
      try {
        // Helper function to calculate subscription amount (defined here for use throughout)
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
            monthly: 1500,
            quarterly: 4000,
            'half yearly': 8000,
            yearly: 13000
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

        // Check if subscription already exists for this user
        const existingSubscription = await (Subscription.findOne as any)({ 
          userId: user._id 
        });

        if (!existingSubscription) {
          // Use the updated subscription type if provided, or existing one, or default to 'monthly'
          const subscriptionType = updateData.subscriptionType || currentUser.subscriptionType || 'monthly';
          
          // If user is being marked as subscribed but has no subscription type, set default
          if (isBecomingSubscribed && !subscriptionType) {
            console.log(`⚠️ User ${user.name} marked as subscribed but no subscription type set. Using default 'monthly'.`);
          }
          
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

          // PRIORITIZE manually entered subscription amount from the form
          // Use updateData first (from form), then currentUser, then calculate
          const subscriptionAmount = updateData.subscriptionAmount !== undefined && updateData.subscriptionAmount !== null
                                   ? updateData.subscriptionAmount
                                   : (currentUser.subscriptionAmount || 
                                      calculateSubscriptionAmount(
                                        updateData.champType || currentUser.champType,
                                        subscriptionType,
                                        updateData.gender || currentUser.gender,
                                        updateData.preferredTimeSlot || currentUser.preferredTimeSlot
                                      ));

          console.log('💰 Subscription amount decision:', {
            fromForm: updateData.subscriptionAmount,
            fromCurrentUser: currentUser.subscriptionAmount,
            finalAmount: subscriptionAmount
          });

          // Calculate next due date based on current date and subscription type
          // PRIORITIZE the user's manual input if provided
          let dueDate = updateData.nextDueDate ? new Date(updateData.nextDueDate) : (currentUser.nextDueDate ? new Date(currentUser.nextDueDate) : null);
          if (!dueDate) {
            const startDate = updateData.subscriptionStartDate || currentUser.subscriptionStartDate || new Date(); // Use subscription start date or current date
            
            if (subscriptionPaymentStatus === 'Pending') {
              // For pending payments, set due date to immediate (needs payment)
              dueDate = startDate;
            } else {
              // For completed payments, calculate next due date - use LAST day of period
              switch (subscriptionType) {
                case 'monthly':
                  // Last day of current month
                  dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                  break;
                case 'quarterly':
                  // Last day of current quarter
                  const currentQuarter = Math.floor(startDate.getMonth() / 3);
                  const lastMonthOfQuarter = (currentQuarter + 1) * 3;
                  dueDate = new Date(startDate.getFullYear(), lastMonthOfQuarter, 0);
                  break;
                case 'half yearly':
                  // Last day of current half-year
                  const currentHalf = Math.floor(startDate.getMonth() / 6);
                  const lastMonthOfHalf = (currentHalf + 1) * 6;
                  dueDate = new Date(startDate.getFullYear(), lastMonthOfHalf, 0);
                  break;
                case 'yearly':
                  // Last day of current year (December 31)
                  dueDate = new Date(startDate.getFullYear(), 11, 31);
                  break;
                default:
                  dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
              }
            }
          }
          
          console.log(`📅 Subscription due date: ${new Date(dueDate).toDateString()} ${updateData.nextDueDate ? '(manually set)' : '(auto-calculated)'}`);

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

          // Normalize paymentMethod to match schema enum (capitalize first letter)
          const rawPaymentMethod = updateData.paymentMethod || currentUser.paymentMethod;
          const normalizedPaymentMethod = rawPaymentMethod 
            ? rawPaymentMethod.charAt(0).toUpperCase() + rawPaymentMethod.slice(1).toLowerCase()
            : undefined;

          const subscriptionData = {
            userId: user._id,
            champId: updateData.champId || user.champId,
            userName: updateData.name || user.name,
            userEmail: updateData.email || user.email,
            userMobile: updateData.mobile || user.mobile,
            subscriptionType: subscriptionType,
            amount: subscriptionAmount,
            mode: updateData.mode || currentUser.mode || 'fixed',
            duration: durationMap[subscriptionType] || 1,
            startDate: updateData.subscriptionStartDate || currentUser.subscriptionStartDate || new Date(),
            endDate: updateData.subscriptionEndDate || currentUser.subscriptionEndDate,
            nextDueDate: dueDate,
            lastPaymentDate: subscriptionPaymentStatus === 'Paid' ? 
              (updateData.paymentCompletedDate || currentUser.paymentCompletedDate || new Date()) : null,
            paymentStatus: subscriptionPaymentStatus,
            ...(normalizedPaymentMethod && { paymentMethod: normalizedPaymentMethod }),
            transactionId: updateData.transactionId || currentUser.transactionId,
            status: 'active',
            preferredSport: updateData.preferredSport || currentUser.preferredSport,
            preferredTimeSlot: updateData.preferredTimeSlot || currentUser.preferredTimeSlot,
            ...(updateData.selectedCourt || currentUser.selectedCourt ? { selectedCourt: updateData.selectedCourt || currentUser.selectedCourt } : {}),
            autoRenewal: false,
            // Required fields that were missing
            subscriptionPeriodId: `${updateData.champId || user.champId}_${Date.now()}`,
            isRenewal: false,
            renewalNumber: 1,
            createdBy: user._id,
            notificationsSent: {
              twoDaysBefore: false,
              onDueDate: false,
              twoDaysAfter: false
            }
          };

          const subscription = await (Subscription.create as any)(subscriptionData);
          subscriptionCreated = true;
          
          if (isBecomingSubscribed) {
            console.log(`🎉 NEW SUBSCRIPTION: User ${user.name} (${user.email}) marked as subscribed - created subscription record ${subscription._id}`);
            console.log(`📊 Subscription Details: Type=${subscriptionType}, Amount=₹${subscriptionAmount}, Payment=${subscriptionPaymentStatus}`);
          } else if (hasSubscribedButNoEntry) {
            console.log(`🔧 FIXED MISSING SUBSCRIPTION: User ${user.name} had subscribed=yes but no subscription entry - created ${subscription._id}`);
            console.log(`📊 Subscription Details: Type=${subscriptionType}, Amount=₹${subscriptionAmount}, Payment=${subscriptionPaymentStatus}`);
          } else {
            console.log(`✅ Subscription created for ${user.name}: ${subscription._id} with payment status: ${subscriptionPaymentStatus}`);
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

          // Recalculate amount if pricing fields changed
          let updatedAmount = existingSubscription.amount;
          if (pricingFieldsChanged || shouldUpdateSubscriptionAmount) {
            updatedAmount = calculateSubscriptionAmount(
              updateData.champType || currentUser.champType,
              subscriptionType,
              updateData.gender || currentUser.gender,
              updateData.preferredTimeSlot || currentUser.preferredTimeSlot
            );
            console.log(`💰 Recalculated subscription amount for ${user.name}: ₹${existingSubscription.amount} → ₹${updatedAmount}`);
          }

          const updateSubscriptionData = {
            champId: updateData.champId || user.champId,
            userName: updateData.name || user.name,
            userEmail: updateData.email || user.email,
            userMobile: updateData.mobile || user.mobile,
            subscriptionType: subscriptionType,
            amount: updatedAmount, // Include the recalculated amount
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

    // Handle subscription amount updates for existing subscriptions when pricing fields change
    if (shouldUpdateSubscriptionAmount) {
      try {
        const existingSubscription = await (Subscription.findOne as any)({ 
          userId: user._id 
        });

        if (existingSubscription) {
          // Helper function to calculate subscription amount (function should be accessible here)
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
              monthly: 1500,
              quarterly: 4000,
              'half yearly': 8000,
              yearly: 13000
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

          const newAmount = calculateSubscriptionAmount(
            updateData.champType || currentUser.champType,
            updateData.subscriptionType || currentUser.subscriptionType,
            updateData.gender || currentUser.gender,
            updateData.preferredTimeSlot || currentUser.preferredTimeSlot
          );

          await (Subscription.findByIdAndUpdate as any)(existingSubscription._id, { 
            amount: newAmount,
            subscriptionType: updateData.subscriptionType || currentUser.subscriptionType,
            preferredSport: updateData.preferredSport || currentUser.preferredSport,
            preferredTimeSlot: updateData.preferredTimeSlot || currentUser.preferredTimeSlot,
            selectedCourt: updateData.selectedCourt || currentUser.selectedCourt,
            updatedAt: new Date()
          });

          console.log(`💰 SUBSCRIPTION AMOUNT UPDATED: ${user.name} subscription amount changed from ₹${existingSubscription.amount} to ₹${newAmount} due to pricing field changes`);
        }
      } catch (amountUpdateError) {
        console.error(`⚠️ Failed to update subscription amount for ${user.name}:`, amountUpdateError);
      }
    }

    // Handle subscription field updates (nextDueDate, dates, etc.) for existing subscriptions
    if (shouldUpdateSubscription) {
      try {
        const existingSubscription = await (Subscription.findOne as any)({ 
          userId: user._id 
        });

        if (existingSubscription) {
          console.log(`📝 Updating subscription fields for ${user.name}...`);
          
          // Prepare update object with only changed fields
          const subscriptionUpdate: any = {
            updatedAt: new Date()
          };

          // Update dates if provided
          if (updateData.nextDueDate !== undefined) {
            subscriptionUpdate.nextDueDate = updateData.nextDueDate;
            console.log(`  - nextDueDate: ${existingSubscription.nextDueDate} → ${updateData.nextDueDate}`);
          }
          
          if (updateData.subscriptionStartDate !== undefined) {
            subscriptionUpdate.startDate = updateData.subscriptionStartDate;
            console.log(`  - startDate: ${existingSubscription.startDate} → ${updateData.subscriptionStartDate}`);
          }
          
          if (updateData.subscriptionEndDate !== undefined) {
            subscriptionUpdate.endDate = updateData.subscriptionEndDate;
            console.log(`  - endDate: ${existingSubscription.endDate} → ${updateData.subscriptionEndDate}`);
          }

          if (updateData.paymentCompletedDate !== undefined) {
            subscriptionUpdate.lastPaidDate = updateData.paymentCompletedDate;
            console.log(`  - lastPaidDate: ${existingSubscription.lastPaidDate} → ${updateData.paymentCompletedDate}`);
          }

          // Update user details if changed
          if (updateData.name) subscriptionUpdate.userName = updateData.name;
          if (updateData.email) subscriptionUpdate.userEmail = updateData.email;
          if (updateData.mobile) subscriptionUpdate.userMobile = updateData.mobile;
          if (updateData.champId) subscriptionUpdate.champId = updateData.champId;
          if (updateData.preferredSport) subscriptionUpdate.preferredSport = updateData.preferredSport;
          if (updateData.preferredTimeSlot) subscriptionUpdate.preferredTimeSlot = updateData.preferredTimeSlot;
          if (updateData.selectedCourt) subscriptionUpdate.selectedCourt = updateData.selectedCourt;
          if (updateData.subscriptionType) subscriptionUpdate.subscriptionType = updateData.subscriptionType;

          // Recalculate overdue status if nextDueDate changed
          if (updateData.nextDueDate !== undefined) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDateObj = new Date(updateData.nextDueDate);
            dueDateObj.setHours(0, 0, 0, 0);
            
            const diffTime = today.getTime() - dueDateObj.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const gracePeriod = user.gracePeriodDays || existingSubscription.gracePeriod || 7;
            
            const paymentStatus = existingSubscription.paymentStatus || 'Pending';
            const isOverdue = diffDays > 0 && paymentStatus !== 'Paid';
            const isPastGrace = diffDays > gracePeriod && paymentStatus !== 'Paid';
            const daysPastDue = Math.max(diffDays, 0);

            subscriptionUpdate.isOverdue = isOverdue;
            subscriptionUpdate.isPastGrace = isPastGrace;
            subscriptionUpdate.daysPastDue = daysPastDue;
            subscriptionUpdate.gracePeriod = gracePeriod;
          }

          await (Subscription.findByIdAndUpdate as any)(existingSubscription._id, subscriptionUpdate);
          console.log(`✅ SUBSCRIPTION UPDATED: ${user.name} subscription ${existingSubscription._id} updated with new field values`);
        } else {
          console.log(`ℹ️ No subscription found for ${user.name} to update`);
        }
      } catch (subscriptionUpdateError) {
        console.error(`⚠️ Failed to update subscription fields for ${user.name}:`, subscriptionUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user,
      subscriptionCreated,
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
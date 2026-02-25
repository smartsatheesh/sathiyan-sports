import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToMongoose } from "@/app/server/mongodb";
import User, { generateNextChampId } from "@/app/models/User";
import Subscription from "@/app/models/Subscription";
import emailService from "@/app/lib/emailService";
import { BillingCycleService } from "@/app/services/BillingCycleService";

// Utility function to normalize time slot formats
function normalizeTimeSlot(timeSlot: string): string {
  if (!timeSlot) return timeSlot;
  
  // Convert "5:00 AM - 6:00 AM" to "05:00 AM - 06:00 AM" format
  return timeSlot.replace(/\b(\d):/g, '0$1:');
}

export async function POST(req: Request) {
  try {
    await connectToMongoose();
    const body = await req.json();
    
    console.log('📝 Registration attempt:', {
      name: body.name,
      email: body.email,
      sport: body.preferredSport,
      timeSlot: body.preferredTimeSlot || 'Not selected',
      court: body.selectedCourt || 'Not selected'
    });

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "mobile",
      "gender", 
      "champType",
      "subscribed",
      "preferredSport",
      "subscriptionType",
      "mode"
    ];
    
    console.log('🔍 Validating required fields...');
    
    // Note: preferredTimeSlot and selectedCourt are now optional
    // Users can set these after payment completion
    
    for (const field of requiredFields) {
      if (!body[field]) {
        const errorMsg = `${field} is required`;
        console.error(`❌ Validation failed: ${errorMsg}`);
        console.error('📋 Received data:', JSON.stringify(body, null, 2));
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 400 }
        );
      }
    }
    
    console.log('✅ All required fields validated');

    // Password validation
    if (body.password !== body.confirmPassword) {
      console.error('❌ Passwords do not match');
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      console.error('❌ Password too short');
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }
    
    console.log('✅ Password validation passed');

    // Note: Court availability checking removed since preferred slots are now optional
    // Users will select and book their slots after registration and payment

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Generate unique ChampID for new registration
    const champId = await generateNextChampId();
    
    // Ensure ChampID was generated successfully
    if (!champId) {
      return NextResponse.json(
        { success: false, message: "Failed to generate ChampID. Please try again." },
        { status: 500 }
      );
    }

    // Create new user with authentication fields
    const userData = {
      champId,
      name: body.name,
      email: body.email,
      mobile: body.mobile,
      password: hashedPassword,
      gender: body.gender,
      champType: body.champType,
      subscribed: body.subscribed,
      preferredSport: body.preferredSport,
      // Set preferred slots as optional - empty by default, users can update after payment
      // Only set selectedCourt for badminton players
      ...(body.preferredSport === "Shuttle Badminton" && body.selectedCourt && { selectedCourt: body.selectedCourt }),
      preferredTimeSlot: body.preferredTimeSlot || "",
      subscriptionType: body.subscriptionType,
      mode: body.mode || "standard",
      subscriptionAmount: body.subscriptionAmount,
      subscriptionEndDate: body.subscriptionEndDate,
      status: "registered", // Set to registered status immediately
      paymentStatus: body.subscribed === 'yes' ? "completed" : "pending", // Auto-complete payment when subscribed=yes
      role: body.role || "customer", // Default to customer role
      provider: "credentials", // Indicates this is a custom registration
      isEmailVerified: false,
      isMobileVerified: false,
      // Keep legacy phone field for backward compatibility
      phone: body.mobile,
      // New fields
      comments: body.comments || "",
    };

    const user = await (User.create as any)(userData);

    console.log('👤 USER CREATED:', {
      id: user._id,
      champId: user.champId,
      name: user.name,
      email: user.email,
      subscribed: body.subscribed,
      subscriptionType: body.subscriptionType,
      subscriptionAmount: body.subscriptionAmount
    });

    // Create subscription entry if user registers with subscribed: "yes"
    console.log('🔍 SUBSCRIPTION CHECK START');
    console.log('🔍 body.subscribed value:', body.subscribed);
    console.log('🔍 body.subscribed type:', typeof body.subscribed);
    console.log('🔍 Strict equality (=== "yes"):', body.subscribed === 'yes');
    console.log('🔍 Loose equality (== "yes"):', body.subscribed == 'yes');
    console.log('🔍 Case insensitive check:', body.subscribed?.toString().toLowerCase() === 'yes');
    
    const shouldCreateSubscription = body.subscribed?.toString().toLowerCase() === 'yes';
    console.log('🔍 FINAL DECISION - shouldCreateSubscription:', shouldCreateSubscription);
    
    if (shouldCreateSubscription) {
      console.log('✅ CREATING SUBSCRIPTION - Condition met!');
      console.log('📝 User Details:', {
        userId: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      });
      
      try {
        // Calculate subscription dates
        const startDate = new Date();
        const durationMap: { [key: string]: number } = {
          'monthly': 1,
          'quarterly': 3,
          'half yearly': 6,
          'yearly': 12
        };

        const duration = durationMap[body.subscriptionType?.toLowerCase()] || 1;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + duration);
        
        console.log('📅 Subscription dates:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: duration
        });

        // Calculate next due date
        let nextDueDate;
        switch (body.subscriptionType?.toLowerCase()) {
          case 'monthly':
            nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            break;
          case 'quarterly':
            const currentQuarter = Math.floor(startDate.getMonth() / 3);
            const lastMonthOfQuarter = (currentQuarter + 1) * 3;
            nextDueDate = new Date(startDate.getFullYear(), lastMonthOfQuarter, 0);
            break;
          case 'half yearly':
            const currentHalf = Math.floor(startDate.getMonth() / 6);
            const lastMonthOfHalf = (currentHalf + 1) * 6;
            nextDueDate = new Date(startDate.getFullYear(), lastMonthOfHalf, 0);
            break;
          case 'yearly':
            nextDueDate = new Date(startDate.getFullYear(), 11, 31);
            break;
          default:
            nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        }

        // Use same payment status logic as user record
        const paymentStatus = body.subscribed === 'yes' ? 'Paid' : 'Pending';

        // Generate unique subscription period ID for tracking renewals
        const subscriptionPeriodId = `${user.champId}-${Date.now()}`;

        const subscriptionData = {
          userId: user._id,
          champId: user.champId,
          userName: user.name,
          userEmail: user.email,
          userMobile: user.mobile,
          subscriptionType: body.subscriptionType,
          amount: body.subscriptionAmount || 0,
          mode: body.mode || 'fixed',
          duration: duration,
          startDate: startDate,
          endDate: endDate,
          nextDueDate: nextDueDate,
          lastPaymentDate: paymentStatus === 'Paid' ? startDate : null,
          paymentStatus: paymentStatus,
          status: 'active',
          preferredSport: body.preferredSport,
          preferredTimeSlot: body.preferredTimeSlot || '',
          ...(body.selectedCourt && { selectedCourt: body.selectedCourt }), // Only include if not empty
          autoRenewal: false,
          subscriptionPeriodId: subscriptionPeriodId,
          isRenewal: false,
          renewalNumber: 1,
          createdBy: user._id,
          notificationsSent: {
            twoDaysBefore: false,
            onDueDate: false,
            twoDaysAfter: false
          }
        };
        
        console.log('📋 ATTEMPTING TO CREATE SUBSCRIPTION WITH DATA:', JSON.stringify(subscriptionData, null, 2));

        const subscription = await (Subscription.create as any)(subscriptionData);
        
        console.log('🎉🎉🎉 SUBSCRIPTION CREATED SUCCESSFULLY! 🎉🎉🎉');
        console.log('📊 Subscription ID:', subscription._id);
        console.log('📊 Full subscription object:', JSON.stringify(subscription.toObject(), null, 2));

      } catch (subscriptionError: any) {
        console.error('❌❌❌ SUBSCRIPTION CREATION FAILED ❌❌❌');
        console.error('❌ Error message:', subscriptionError.message);
        console.error('❌ Error name:', subscriptionError.name);
        console.error('❌ Error code:', subscriptionError.code);
        console.error('❌ Full error:', JSON.stringify(subscriptionError, null, 2));
        console.error('❌ Error stack:', subscriptionError.stack);
        // Don't fail registration if subscription creation fails
      }
    } else {
      console.log('⏭️ SKIPPING SUBSCRIPTION CREATION');
      console.log('⏭️ Reason: subscribed value is not "yes"');
      console.log('⏭️ Received value:', body.subscribed);
    }
    
    console.log('✅ User registration successful:', user.champId);

    // Send welcome email (async, don't wait for it)
    emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
      console.warn('Failed to send welcome email:', error);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful! Welcome to Sathiyan Sports.",
        user: {
          id: user._id,
          champId: user.champId,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          preferredSport: user.preferredSport,
          subscriptionType: user.subscriptionType,
          subscriptionAmount: user.subscriptionAmount,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: errorMessages.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key error (should only be ChampID now)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'champId') {
        return NextResponse.json(
          { success: false, message: "ChampID already exists. Please try registering again." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: `${field} already exists` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Error during registration. Please try again." },
      { status: 500 }
    );
  }
}

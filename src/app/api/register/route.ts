import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToMongoose } from "@/app/server/mongodb";
import User, { generateNextChampId } from "@/app/models/User";
import Subscription from "@/app/models/Subscription";
import emailService from "@/app/lib/emailService";

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
    
    // Note: preferredTimeSlot and selectedCourt are now optional
    // Users can set these after payment completion
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Password validation
    if (body.password !== body.confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

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
      paymentStatus: "pending", // Will be updated after payment
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

    // Create subscription entry if user registers with subscribed: "yes"
    if (body.subscribed === 'yes') {
      try {
        // Calculate subscription dates
        const startDate = new Date();
        const durationMap = {
          'monthly': 1,
          'quarterly': 3,
          'half yearly': 6,
          'yearly': 12
        };

        const duration = durationMap[body.subscriptionType] || 1;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + duration);

        // Calculate next due date
        let nextDueDate;
        switch (body.subscriptionType) {
          case 'monthly':
            nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
            break;
          case 'quarterly':
            const currentQuarter = Math.floor(startDate.getMonth() / 3);
            const nextQuarterMonth = (currentQuarter + 1) * 3;
            nextDueDate = nextQuarterMonth >= 12 ? 
              new Date(startDate.getFullYear() + 1, 0, 1) : 
              new Date(startDate.getFullYear(), nextQuarterMonth, 1);
            break;
          case 'half yearly':
            const currentHalf = Math.floor(startDate.getMonth() / 6);
            const nextHalfMonth = (currentHalf + 1) * 6;
            nextDueDate = nextHalfMonth >= 12 ? 
              new Date(startDate.getFullYear() + 1, 0, 1) : 
              new Date(startDate.getFullYear(), nextHalfMonth, 1);
            break;
          case 'yearly':
            nextDueDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), 1);
            break;
          default:
            nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        }

        // Determine payment status - for new registrations, it's typically pending
        const paymentStatus = body.paymentStatus === 'completed' ? 'Paid' : 'Pending';

        // Calculate overdue status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(nextDueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - dueDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const gracePeriod = 7; // Default grace period
        
        const isOverdue = diffDays > 0 && paymentStatus !== 'Paid';
        const isPastGrace = diffDays > gracePeriod && paymentStatus !== 'Paid';
        const daysPastDue = Math.max(diffDays, 0);

        const subscriptionData = {
          userId: user._id,
          champId: user.champId,
          userName: user.name,
          userEmail: user.email,
          userMobile: user.mobile,
          subscriptionType: body.subscriptionType,
          amount: body.subscriptionAmount,
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
          selectedCourt: body.selectedCourt || '',
          autoRenewal: false,
          createdBy: user._id,
          notificationsSent: {
            twoDaysBefore: false,
            onDueDate: false,
            twoDaysAfter: false
          }
        };

        const subscription = await (Subscription.create as any)(subscriptionData);
        console.log(`🎉 NEW REGISTRATION SUBSCRIPTION: User ${user.name} registered with subscribed=yes - created subscription ${subscription._id}`);
        console.log(`📊 Subscription Details: Type=${body.subscriptionType}, Amount=₹${body.subscriptionAmount}, Payment=${paymentStatus}`);

      } catch (subscriptionError) {
        console.error(`⚠️ Failed to create subscription for new user ${user.name}:`, subscriptionError);
        // Don't fail registration if subscription creation fails
      }
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

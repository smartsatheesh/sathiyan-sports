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
      preferredSport: body.preferredSport,
      // Set preferred slots as optional - empty by default, users can update after payment
      selectedCourt: body.selectedCourt || "",
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

    // Create subscription entry for fee management
    try {
      // Calculate duration based on subscription type
      const durationMap = {
        'monthly': 1,
        'quarterly': 3,
        'half yearly': 6,
        'yearly': 12
      };

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMap[body.subscriptionType]);

      const subscriptionData = {
        userId: user._id,
        champId: user.champId,
        userName: user.name,
        userEmail: user.email,
        userMobile: user.mobile,
        subscriptionType: body.subscriptionType,
        mode: body.mode || 'standard',
        amount: body.subscriptionAmount,
        duration: durationMap[body.subscriptionType],
        startDate,
        endDate,
        nextDueDate: endDate,
        paymentStatus: 'Pending',
        status: 'pending',
        preferredSport: body.preferredSport,
        preferredTimeSlot: body.preferredTimeSlot,
        selectedCourt: body.selectedCourt,
        autoRenewal: false,
        createdBy: user._id
      };

      const subscription = await (Subscription.create as any)(subscriptionData);
      console.log('✅ Subscription entry created:', subscription._id);
    } catch (subscriptionError) {
      console.warn('⚠️ Failed to create subscription entry:', subscriptionError);
      // Don't fail the registration if subscription creation fails
    }

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

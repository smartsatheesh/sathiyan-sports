import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToMongoose } from "@/app/server/mongodb";
import User, { generateNextChampId } from "@/app/models/User";
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
      timeSlot: body.preferredTimeSlot,
      court: body.selectedCourt
    });

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "mobile",
      "gender",
      "preferredSport",
      "subscriptionType",
    ];
    
    // Add conditional required fields
    if (body.preferredSport === "Shuttle Badminton") {
      requiredFields.push("selectedCourt", "preferredTimeSlot");
    }    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Court selection is only required for Shuttle Badminton
    if (body.preferredSport === "Shuttle Badminton" && !body.selectedCourt) {
      return NextResponse.json(
        { success: false, message: "Court selection is required for Shuttle Badminton" },
        { status: 400 }
      );
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

    // Validate court selection and check availability only for Shuttle Badminton
    if (body.preferredSport === "Shuttle Badminton") {
      const validCourts = ["S1", "S2", "S3"];
      if (!validCourts.includes(body.selectedCourt)) {
        return NextResponse.json(
          { success: false, message: "Invalid court selection. Please choose S1, S2, or S3" },
          { status: 400 }
        );
      }

      // Check slot availability for Shuttle Badminton registrations
      if (body.preferredTimeSlot) {
        const normalizedRequestedSlot = normalizeTimeSlot(body.preferredTimeSlot);
        console.log('🔍 Registration: Checking slot capacity for:', body.preferredTimeSlot, '-> normalized:', normalizedRequestedSlot, 'court:', body.selectedCourt);

        // Count existing users with the same slot and court (capacity check only)
        let totalUsersInSlot = 0;

        // Count users with preferredTimeSlot (including pending users for real-time capacity checking)
        const existingUsersWithSlot = await (User.find as any)({
          preferredTimeSlot: { $exists: true },
          selectedCourt: body.selectedCourt,
          status: { $in: ['pending', 'verified'] }, // Include pending users
          preferredSport: "Shuttle Badminton"
        });

        existingUsersWithSlot.forEach((user: any) => {
          if (user.preferredTimeSlot) {
            const normalizedExistingSlot = normalizeTimeSlot(user.preferredTimeSlot);
            console.log(`🔍 Checking user ${user.name} (${user.champId}): slot "${user.preferredTimeSlot}" -> normalized "${normalizedExistingSlot}"`);
            if (normalizedExistingSlot === normalizedRequestedSlot) {
              totalUsersInSlot++;
              console.log(`✅ Match found! Total users in slot: ${totalUsersInSlot}`);
            }
          }
        });

        // Count users with registered slots
        const usersWithRegisteredSlots = await (User.find as any)({
          "registeredSlots.timeSlot": { $exists: true },
          status: "verified", 
          paymentStatus: "completed",
          preferredSport: "Shuttle Badminton"
        });

        usersWithRegisteredSlots.forEach((user: any) => {
          if (user.registeredSlots && Array.isArray(user.registeredSlots)) {
            user.registeredSlots.forEach((slot: any) => {
              if (slot.timeSlot && slot.court === body.selectedCourt) {
                const normalizedSlotTimeSlot = normalizeTimeSlot(slot.timeSlot);
                if (normalizedSlotTimeSlot === normalizedRequestedSlot) {
                  totalUsersInSlot++;
                }
              }
            });
          }
        });

        console.log(`📊 Final count for ${body.selectedCourt} at ${normalizedRequestedSlot}: ${totalUsersInSlot}/6 users`);

        // Check if adding this user would exceed the 4-user capacity
        if (totalUsersInSlot >= 6) {
          console.log('❌ Registration: Court capacity exceeded -', totalUsersInSlot, 'users already in slot');
          return NextResponse.json(
            { 
              success: false, 
              message: `Court ${body.selectedCourt} is at full capacity (${totalUsersInSlot}/6 users) for ${body.preferredTimeSlot}. Please choose a different court or time slot.`,
              capacityExceeded: true
            },
            { status: 400 }
          );
        }

        console.log('✅ Registration: Capacity available -', totalUsersInSlot, 'users in slot, proceeding with registration');
      }
    }

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
      ...(body.preferredSport === "Shuttle Badminton" && { 
        selectedCourt: body.selectedCourt,
        preferredTimeSlot: body.preferredTimeSlot 
      }),
      subscriptionType: body.subscriptionType,
      subscriptionAmount: body.subscriptionAmount,
      subscriptionEndDate: body.subscriptionEndDate,
      role: body.role || "customer", // Default to customer role
      provider: "credentials", // Indicates this is a custom registration
      isEmailVerified: false,
      isMobileVerified: false,
      // Keep legacy phone field for backward compatibility
      phone: body.mobile,
      // New fields
      comments: body.comments || "",
      mode: body.mode || "",
    };

    const user = await (User.create as any)(userData);

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

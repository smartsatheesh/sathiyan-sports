import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";
import emailService from "@/app/lib/emailService";

export async function POST(req: Request) {
  try {
    await connectToMongoose();
    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "email",
      "mobile",
      "password",
      "confirmPassword",
      "gender",
      "preferredSport",
      "preferredTimeSlot",
      "subscriptionType",
      "subscriptionAmount",
      "subscriptionEndDate",
    ];

    for (const field of requiredFields) {
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

      // Check court availability for the selected time slot
      const COURT_CAPACITY = 4;
      const usersInSlot = await (User.find as any)({
        preferredTimeSlot: body.preferredTimeSlot,
        selectedCourt: body.selectedCourt,
        status: "verified",
        paymentStatus: "completed",
      });

      if (usersInSlot.length >= COURT_CAPACITY) {
        // Check other available courts
        const allCourtsInSlot = await (User.find as any)({
          preferredTimeSlot: body.preferredTimeSlot,
          status: "verified",
          paymentStatus: "completed",
        });

        const courtBookings: { [key: string]: number } = { S1: 0, S2: 0, S3: 0 };
        allCourtsInSlot.forEach((user: any) => {
          if (user.selectedCourt && validCourts.includes(user.selectedCourt)) {
            courtBookings[user.selectedCourt]++;
          }
        });

        const availableCourts = validCourts.filter(court => courtBookings[court] < COURT_CAPACITY);
        
        if (availableCourts.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Court ${body.selectedCourt} is fully booked for ${body.preferredTimeSlot}. Available courts: ${availableCourts.join(', ')}`,
              availableCourts,
              suggestedCourts: availableCourts
            },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { 
              success: false, 
              message: `All courts are fully booked for ${body.preferredTimeSlot}. Please choose a different time slot.`,
              availableCourts: [],
              suggestedCourts: []
            },
            { status: 400 }
          );
        }
      }
    }

    // Check if user already exists by email or mobile
    const existingUser = await (User.findOne as any)({
      $or: [
        { email: body.email },
        { mobile: body.mobile }
      ]
    });

    if (existingUser) {
      const field = existingUser.email === body.email ? "Email" : "Mobile number";
      return NextResponse.json(
        { success: false, message: `${field} already registered` },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Create new user with authentication fields
    const userData = {
      name: body.name,
      email: body.email,
      mobile: body.mobile,
      password: hashedPassword,
      gender: body.gender,
      preferredSport: body.preferredSport,
      preferredTimeSlot: body.preferredTimeSlot,
      ...(body.preferredSport === "Shuttle Badminton" && { selectedCourt: body.selectedCourt }),
      subscriptionType: body.subscriptionType,
      subscriptionAmount: body.subscriptionAmount,
      subscriptionEndDate: body.subscriptionEndDate,
      role: body.role || "customer", // Default to customer role
      provider: "credentials", // Indicates this is a custom registration
      isEmailVerified: false,
      isMobileVerified: false,
      // Keep legacy phone field for backward compatibility
      phone: body.mobile,
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

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
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

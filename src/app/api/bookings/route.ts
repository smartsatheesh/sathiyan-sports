import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../server/Mongo";
import Booking from "../../models/Booking";
import { format, startOfDay, endOfDay } from "date-fns";
import { NotificationService } from "../../services/notificationService";

// POST - Create a new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();

    const {
      sport,
      date,
      timeSlots,
      totalAmount,
      pricePerSlot,
      isWeekend,
      customerName,
      customerEmail,
      customerPhone,
      paymentExpiry,
      paymentStatus = "pending",
      bookingStatus = "pending",
    } = body;

    // Validate required fields
    if (!sport || !date || !timeSlots || timeSlots.length === 0 || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { message: "Missing required fields", success: false },
        { status: 400 }
      );
    }

    // Check if any of the selected time slots are already booked (only for confirmed bookings)
    const bookingDate = new Date(date);
    const existingBookings = await Booking.find({
      sport,
      date: {
        $gte: startOfDay(bookingDate),
        $lte: endOfDay(bookingDate),
      },
      timeSlots: { $in: timeSlots },
      bookingStatus: { $in: ["confirmed", "pending"] }, // Include pending bookings
      paymentStatus: { $ne: "expired" }, // Exclude expired payments
    });

    if (existingBookings.length > 0) {
      const bookedSlots = existingBookings.flatMap(booking => booking.timeSlots);
      const conflictingSlots = timeSlots.filter((slot: string) => bookedSlots.includes(slot));
      
      return NextResponse.json(
        { 
          message: "Some time slots are already booked", 
          success: false,
          conflictingSlots 
        },
        { status: 409 }
      );
    }

    // Create the booking
    const booking = await Booking.create({
      sport,
      date: bookingDate,
      timeSlots,
      totalAmount,
      pricePerSlot,
      isWeekend,
      customerName,
      customerEmail,
      customerPhone,
      paymentExpiry: paymentExpiry ? new Date(paymentExpiry) : undefined,
      paymentStatus,
      bookingStatus,
    });

    // Send booking confirmation notifications
    try {
      const userNotificationData = {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        preferences: {
          sms: true,
          push: false, // User hasn't set up push notifications yet
          whatsapp: true,
        },
      };

      const bookingDetails = {
        bookingId: booking._id.toString(),
        sport,
        date: format(bookingDate, 'dd MMM yyyy'),
        timeSlots,
        totalAmount,
      };

      await NotificationService.sendBookingConfirmation(userNotificationData, bookingDetails);
    } catch (notificationError) {
      console.error('Failed to send booking confirmation notifications:', notificationError);
      // Don't fail the booking creation if notifications fail
    }

    return NextResponse.json({
      message: "Booking created successfully",
      success: true,
      booking,
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { message: "Error creating booking", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET - Fetch booked slots for a specific date and sport
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const date = searchParams.get("date");

    if (!sport || !date) {
      return NextResponse.json(
        { message: "Sport and date parameters are required", success: false },
        { status: 400 }
      );
    }

    const queryDate = new Date(date);
    
    // Find all bookings for the specified sport and date (exclude cancelled and expired)
    const bookings = await Booking.find({
      sport,
      date: {
        $gte: startOfDay(queryDate),
        $lte: endOfDay(queryDate),
      },
      bookingStatus: { $nin: ["cancelled", "expired"] },
      paymentStatus: { $nin: ["expired", "cancelled"] },
    }).select("timeSlots");

    // Extract all booked time slots
    const bookedSlots = bookings.flatMap(booking => booking.timeSlots);

    return NextResponse.json({
      success: true,
      bookedSlots: [...new Set(bookedSlots)], // Remove duplicates
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    return NextResponse.json(
      { message: "Error fetching booked slots", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

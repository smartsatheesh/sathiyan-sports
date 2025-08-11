import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../server/Mongo";
import Booking from "../../models/Booking";
import { format, startOfDay, endOfDay } from "date-fns";
// COMMENTED OUT: Notification services (Twilio/Firebase)
// import { NotificationService } from "../../services/notificationService";

// POST - Create a new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();

    const {
      sport,
      date,
      timeSlots,
      court, // Add court field for Shuttle Badminton
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

    // Validate court selection for Shuttle Badminton
    if (sport === "Shuttle Badminton" && !court) {
      return NextResponse.json(
        { message: "Court selection is required for Shuttle Badminton", success: false },
        { status: 400 }
      );
    }

    // Check if any of the selected time slots are already booked
    const bookingDate = new Date(date);
    let existingBookingsQuery: any = {
      sport,
      date: {
        $gte: startOfDay(bookingDate),
        $lte: endOfDay(bookingDate),
      },
      timeSlots: { $in: timeSlots },
      bookingStatus: { $in: ["confirmed", "pending"] }, // Include pending bookings
      paymentStatus: { $ne: "expired" }, // Exclude expired payments
    };

    // For Shuttle Badminton, check conflicts only for the specific court
    if (sport === "Shuttle Badminton" && court) {
      existingBookingsQuery.court = court;
    }

    const existingBookings = await Booking.find(existingBookingsQuery);

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
    const bookingData: any = {
      sport,
      date: bookingDate,
      timeSlots,
      totalAmount,
      pricePerSlot,
      isWeekend,
      customerName,
      customerEmail,
      customerPhone,
      bookingReference: `BK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      paymentExpiry: paymentExpiry ? new Date(paymentExpiry) : undefined,
      paymentStatus,
      bookingStatus,
    };

    // Add court field for Shuttle Badminton
    if (sport === "Shuttle Badminton" && court) {
      bookingData.court = court;
    }

    const booking = await Booking.create(bookingData);

    // Send booking confirmation notifications (WhatsApp only)
    try {
      const userNotificationData = {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        preferences: {
          sms: false, // COMMENTED OUT: Twilio SMS disabled
          push: false, // COMMENTED OUT: Firebase push notifications disabled
          whatsapp: true, // Only WhatsApp remains active
        },
      };

      const bookingDetails = {
        bookingId: booking._id.toString(),
        sport,
        date: format(bookingDate, 'dd MMM yyyy'),
        timeSlots,
        totalAmount,
      };

      // COMMENTED OUT: Notification services (Twilio/Firebase)
      // await NotificationService.sendBookingConfirmation(userNotificationData, bookingDetails);
      
      // Only WhatsApp notifications remain active
      console.log('Booking confirmation - WhatsApp notification would be sent:', { userNotificationData, bookingDetails });
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
    const court = searchParams.get("court"); // Add court parameter for Shuttle Badminton

    if (!sport || !date) {
      return NextResponse.json(
        { message: "Sport and date parameters are required", success: false },
        { status: 400 }
      );
    }

    const queryDate = new Date(date);
    
    // Build query for finding bookings
    let bookingQuery: any = {
      sport,
      date: {
        $gte: startOfDay(queryDate),
        $lte: endOfDay(queryDate),
      },
      bookingStatus: { $nin: ["cancelled", "expired"] },
      paymentStatus: { $nin: ["expired", "cancelled"] },
    };

    // For Shuttle Badminton, if court is specified, filter by court
    // If no court specified, return slots for ALL courts (for general availability)
    if (sport === "Shuttle Badminton" && court) {
      bookingQuery.court = court;
    }

    const bookings = await Booking.find(bookingQuery).select("timeSlots court");

    // For Shuttle Badminton without specific court, return court-specific data
    if (sport === "Shuttle Badminton" && !court) {
      const courtBookings: { [key: string]: string[] } = {
        S1: [],
        S2: [],
        S3: []
      };

      bookings.forEach(booking => {
        const bookingCourt = booking.court || 'S1'; // Default to S1 for legacy bookings
        if (courtBookings[bookingCourt]) {
          courtBookings[bookingCourt].push(...booking.timeSlots);
        }
      });

      // Remove duplicates for each court
      Object.keys(courtBookings).forEach(court => {
        courtBookings[court] = [...new Set(courtBookings[court])];
      });

      return NextResponse.json({
        success: true,
        courtBookings,
        bookedSlots: [], // Keep for backward compatibility
      });
    }

    // Extract all booked time slots (for other sports or specific court)
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

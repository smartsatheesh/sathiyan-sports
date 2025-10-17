import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Booking from "../../models/Booking";
import User from "../../models/User";
import { format, startOfDay, endOfDay } from "date-fns";
// COMMENTED OUT: Notification services (Twilio/Firebase)
// import { NotificationService } from "../../services/notificationService";

// POST - Create a new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectToMongoose();

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

    const existingBookings = await (Booking.find as any)(existingBookingsQuery);

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

    // Check for registered slots conflict (monthly/yearly subscribers)
    if (sport === "Shuttle Badminton") {
      const dayOfWeek = format(bookingDate, "EEEE").toLowerCase();
      
      let registeredUsersQuery: any = {
        preferredSport: sport,
        status: "verified",
        paymentStatus: { $in: ["completed", "confirmed"] },
        subscriptionType: { $in: ["monthly", "yearly"] },
        isActive: true,
        subscriptionEndDate: { $gte: bookingDate },
        "registeredSlots.dayOfWeek": dayOfWeek,
      };

      if (court) {
        registeredUsersQuery["registeredSlots.court"] = court;
      }

      const registeredUsers = await (User.find as any)(registeredUsersQuery).select("registeredSlots selectedCourt");

      // Extract registered time slots for the booking date
      const registeredTimeSlots: string[] = [];
      registeredUsers.forEach(user => {
        user.registeredSlots.forEach((slot: any) => {
          if (slot.dayOfWeek === dayOfWeek) {
            const slotCourt = slot.court || user.selectedCourt || 'S1';
            if (!court || slotCourt === court) {
              registeredTimeSlots.push(slot.timeSlot);
            }
          }
        });
      });

      // Check if any requested time slots conflict with registered slots
      const conflictingRegisteredSlots = timeSlots.filter((slot: string) => registeredTimeSlots.includes(slot));
      
      if (conflictingRegisteredSlots.length > 0) {
        return NextResponse.json(
          { 
            message: "Some time slots are reserved for registered members", 
            success: false,
            conflictingSlots: conflictingRegisteredSlots,
            type: "registered_conflict"
          },
          { status: 409 }
        );
      }
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

    const booking = await (Booking.create as any)(bookingData);

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
    await connectToMongoose();

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
    const dayOfWeek = format(queryDate, "EEEE").toLowerCase(); // Get day of week for registered slots
    
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

    const bookings = await (Booking.find as any)(bookingQuery).select("timeSlots court");

    // Fetch registered slots for monthly/yearly verified users
    let registeredSlots: string[] = [];
    let registeredCourtSlots: { [key: string]: string[] } = {
      S1: [],
      S2: [],
      S3: []
    };

    if (sport === "Shuttle Badminton") {
      // Build query for finding registered users
      let userQuery: any = {
        preferredSport: sport,
        status: "verified", // Only verified users
        paymentStatus: { $in: ["completed", "confirmed"] }, // Only users with confirmed payments
        subscriptionType: { $in: ["monthly", "yearly"] }, // Only monthly/yearly subscribers
        isActive: true,
        // Check if subscription is still valid
        subscriptionEndDate: { $gte: queryDate },
        "registeredSlots.dayOfWeek": dayOfWeek,
      };

      // If court is specified, filter by court
      if (court) {
        userQuery["registeredSlots.court"] = court;
      }

      const registeredUsers = await (User.find as any)(userQuery).select("registeredSlots preferredSport subscriptionType selectedCourt");

      // Extract registered slots for the specific day
      registeredUsers.forEach(user => {
        user.registeredSlots.forEach((slot: any) => {
          if (slot.dayOfWeek === dayOfWeek) {
            const slotCourt = slot.court || user.selectedCourt || 'S1';
            
            if (court) {
              // If specific court requested, only return slots for that court
              if (slotCourt === court) {
                registeredSlots.push(slot.timeSlot);
              }
            } else {
              // Return all slots organized by court
              if (registeredCourtSlots[slotCourt]) {
                registeredCourtSlots[slotCourt].push(slot.timeSlot);
              }
              registeredSlots.push(slot.timeSlot);
            }
          }
        });
      });

      // Remove duplicates
      registeredSlots = [...new Set(registeredSlots)];
      Object.keys(registeredCourtSlots).forEach(courtKey => {
        registeredCourtSlots[courtKey] = [...new Set(registeredCourtSlots[courtKey])];
      });
    }

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
      Object.keys(courtBookings).forEach(courtKey => {
        courtBookings[courtKey] = [...new Set(courtBookings[courtKey])];
      });

      // Merge registered slots with booked slots for each court
      Object.keys(courtBookings).forEach(courtKey => {
        if (registeredCourtSlots[courtKey]) {
          courtBookings[courtKey] = [...new Set([...courtBookings[courtKey], ...registeredCourtSlots[courtKey]])];
        }
      });

      return NextResponse.json({
        success: true,
        courtBookings,
        bookedSlots: [], // Keep for backward compatibility
        registeredSlots: registeredCourtSlots,
      });
    }

    // Extract all booked time slots (for other sports or specific court)
    const bookedSlots = bookings.flatMap(booking => booking.timeSlots);
    
    // Merge booked slots with registered slots
    const allBlockedSlots = [...new Set([...bookedSlots, ...registeredSlots])];

    return NextResponse.json({
      success: true,
      bookedSlots: allBlockedSlots, // Now includes both booked and registered slots
      registeredSlots: registeredSlots, // Separate array for registered slots info
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    return NextResponse.json(
      { message: "Error fetching booked slots", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

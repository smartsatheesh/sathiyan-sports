import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Booking from "../../models/Booking";
import User from "../../models/User";
import { format, startOfDay, endOfDay } from "date-fns";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
// COMMENTED OUT: Notification services (Twilio/Firebase)
// import { NotificationService } from "../../services/notificationService";

// Utility function to normalize time slot formats
function normalizeTimeSlot(timeSlot: string): string {
  if (!timeSlot) return timeSlot;
  
  // Convert "5:00 AM - 6:00 AM" to "05:00 AM - 06:00 AM" format
  return timeSlot.replace(/\b(\d):/g, '0$1:');
}

function expandStoredSlots(timeSlots: string[] = []): string[] {
  return [...new Set(
    timeSlots
      .flatMap((slot) => String(slot || '').split(','))
      .map((slot) => slot.trim())
      .filter(Boolean)
  )];
}

// POST - Create a new booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    const {
      sport,
      date,
      timeSlots,
      nextDayDate, // For cross-midnight bookings
      nextDayTimeSlots, // For cross-midnight bookings
      court, // Add court field for Shuttle Badminton
      totalAmount,
      pricePerSlot,
      isWeekend,
      customerName,
      customerEmail,
      customerPhone,
      paymentExpiry,
      paymentStatus = "pending",
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
    
    // Define cross-turf sports (Cricket, Football, and Functions&Events share same turf)
    const crossTurfSports = ["Cricket", "Football", "Functions and Events"];
    
    let existingBookingsQuery: any = {
      bookingStatus: "confirmed", // Only confirmed bookings block slots
      // Payment status doesn't matter - confirmed is confirmed
      $or: [
        {
          date: {
            $gte: startOfDay(bookingDate),
            $lte: endOfDay(bookingDate),
          },
          timeSlots: { $in: timeSlots },
        },
        {
          nextDayDate: {
            $gte: startOfDay(bookingDate),
            $lte: endOfDay(bookingDate),
          },
          nextDayTimeSlots: { $in: timeSlots },
        },
      ],
    };

    // If the sport is part of cross-turf sports, check against all cross-turf sports
    if (crossTurfSports.includes(sport)) {
      existingBookingsQuery.sport = { $in: crossTurfSports };
    } else {
      // For Badminton or others, check only that sport
      existingBookingsQuery.sport = sport;
    }

    // For Shuttle Badminton, check conflicts only for the specific court
    if (sport === "Shuttle Badminton" && court) {
      existingBookingsQuery.court = court;
    }

    const existingBookings = await (Booking.find as any)(existingBookingsQuery);

    // For Shuttle Badminton, check capacity limit (6 users per court per slot)
    if (sport === "Shuttle Badminton" && court) {
      for (const requestedSlot of timeSlots) {
        // Count existing bookings for this specific slot and court
        const slotBookingsCount = existingBookings.filter(booking => 
          booking.timeSlots.includes(requestedSlot) && booking.court === court
        ).length;

        // Count registered users for this slot and court
        // Query registered slots
        const registeredSlotsQuery: any = {
          preferredSport: sport,
          paymentStatus: { $in: ["completed", "confirmed"] },
          subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] },
          isActive: true,
          subscriptionEndDate: { $gte: bookingDate },
          "registeredSlots.timeSlot": normalizeTimeSlot(requestedSlot),
          "registeredSlots.court": court
        };

        const registeredSlotsCount = await (User.countDocuments as any)(registeredSlotsQuery);
        
        // Query users registered via preferredTimeSlot/selectedCourt (old method)
        const legacyRegisteredQuery: any = {
          preferredSport: sport,
          preferredTimeSlot: normalizeTimeSlot(requestedSlot),
          selectedCourt: court,
          paymentStatus: { $in: ["completed", "confirmed"] },
          subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] },
          isActive: true,
          subscriptionEndDate: { $gte: bookingDate }
        };
        
        const legacyRegisteredCount = await (User.countDocuments as any)(legacyRegisteredQuery);
        const registeredUsersCount = registeredSlotsCount + legacyRegisteredCount;
        
        const totalBookings = slotBookingsCount + registeredUsersCount;
        
        if (totalBookings >= 6) {
          return NextResponse.json(
            { 
              message: `Court ${court} is at full capacity (6/6 users) for ${requestedSlot}. Please choose a different court or time slot.`,
              success: false,
              conflictingSlots: [requestedSlot],
              type: "capacity_full"
            },
            { status: 409 }
          );
        }
      }
    }

    if (existingBookings.length > 0) {
      const bookedSlots = existingBookings.flatMap((booking: any) => [
        ...(booking.timeSlots || []),
        ...(booking.nextDayTimeSlots || []),
      ]);
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

    // Check for conflicts on next day if cross-midnight booking
    if (nextDayDate && nextDayTimeSlots && nextDayTimeSlots.length > 0) {
      const nextDay = new Date(nextDayDate);
      
      let nextDayConflictQuery: any = {
        bookingStatus: "confirmed",
        $or: [
          {
            date: {
              $gte: startOfDay(nextDay),
              $lte: endOfDay(nextDay),
            },
            timeSlots: { $in: nextDayTimeSlots },
          },
          {
            nextDayDate: {
              $gte: startOfDay(nextDay),
              $lte: endOfDay(nextDay),
            },
            nextDayTimeSlots: { $in: nextDayTimeSlots },
          },
        ],
      };

      if (crossTurfSports.includes(sport)) {
        nextDayConflictQuery.sport = { $in: crossTurfSports };
      } else {
        nextDayConflictQuery.sport = sport;
      }

      if (sport === "Shuttle Badminton" && court) {
        nextDayConflictQuery.court = court;
      }

      const nextDayConflicts = await (Booking.find as any)(nextDayConflictQuery);

      if (nextDayConflicts.length > 0) {
        const nextDayBookedSlots = nextDayConflicts.flatMap((booking: any) => [
          ...(booking.timeSlots || []),
          ...(booking.nextDayTimeSlots || []),
        ]);
        const nextDayConflictingSlots = nextDayTimeSlots.filter((slot: string) => nextDayBookedSlots.includes(slot));
        
        return NextResponse.json(
          { 
            message: "Some time slots on the next day are already booked", 
            success: false,
            conflictingSlots: nextDayConflictingSlots 
          },
          { status: 409 }
        );
      }
    }

    // Check for registered slots conflict (monthly/quarterly/half yearly/yearly subscribers)
    if (sport === "Shuttle Badminton") {
      let registeredUsersQuery: any = {
        preferredSport: sport,
        paymentStatus: { $in: ["completed", "confirmed"] },
        subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] },
        isActive: true,
        subscriptionEndDate: { $gte: bookingDate },
        "registeredSlots.0": { $exists: true }, // Has at least one registered slot
      };

      if (court) {
        registeredUsersQuery["registeredSlots.court"] = court;
      }

      const registeredUsers = await (User.find as any)(registeredUsersQuery).select("registeredSlots selectedCourt");

      // Extract registered time slots for the booking date
      const registeredTimeSlots: string[] = [];
      registeredUsers.forEach(user => {
        user.registeredSlots.forEach((slot: any) => {
          const slotCourt = slot.court || user.selectedCourt || 'S1';
          if (!court || slotCourt === court) {
            registeredTimeSlots.push(normalizeTimeSlot(slot.timeSlot));
          }
        });
      });

      // Normalize the requested time slots for comparison
      const normalizedRequestedSlots = timeSlots.map((slot: string) => normalizeTimeSlot(slot));

      // Check if any requested time slots conflict with registered slots
      const conflictingRegisteredSlots = normalizedRequestedSlots.filter((normalizedSlot: string) => 
        registeredTimeSlots.includes(normalizedSlot)
      );
      
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
    } else if (crossTurfSports.includes(sport)) {
      // For cross-turf sports, check registered users from any of the three sports
      let registeredUsersQuery: any = {
        preferredSport: { $in: crossTurfSports },
        paymentStatus: { $in: ["completed", "confirmed"] },
        subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] },
        isActive: true,
        subscriptionEndDate: { $gte: bookingDate },
        "registeredSlots.0": { $exists: true }, // Has at least one registered slot
      };

      const registeredUsers = await (User.find as any)(registeredUsersQuery).select("registeredSlots selectedCourt preferredSport");

      // Extract registered time slots for the booking date
      const registeredTimeSlots: string[] = [];
      registeredUsers.forEach(user => {
        // Only include if registered for one of the cross-turf sports
        if (crossTurfSports.includes(user.preferredSport)) {
          user.registeredSlots.forEach((slot: any) => {
            registeredTimeSlots.push(normalizeTimeSlot(slot.timeSlot));
          });
        }
      });

      // Normalize the requested time slots for comparison
      const normalizedRequestedSlots = timeSlots.map((slot: string) => normalizeTimeSlot(slot));

      // Check if any requested time slots conflict with registered slots
      const conflictingRegisteredSlots = normalizedRequestedSlots.filter((normalizedSlot: string) => 
        registeredTimeSlots.includes(normalizedSlot)
      );
      
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

    // For cross-day bookings, lock the booking to latest day while keeping earlier-day slots in secondary fields.
    let primaryDate = bookingDate;
    let primaryTimeSlots = timeSlots;
    let secondaryDate = nextDayDate ? new Date(nextDayDate) : undefined;
    let secondaryTimeSlots = nextDayTimeSlots;

    if (nextDayDate && nextDayTimeSlots && nextDayTimeSlots.length > 0) {
      primaryDate = new Date(nextDayDate);
      primaryTimeSlots = nextDayTimeSlots;
      secondaryDate = bookingDate;
      secondaryTimeSlots = timeSlots;
    }

    // Create the booking
    // Booking block rule: only bookingStatus controls blocking.
    // Admin -> confirmed immediately; others -> pending until admin approval.
    const finalBookingStatus = isAdmin ? "confirmed" : "pending";

    const bookingData: any = {
      sport,
      date: primaryDate,
      timeSlots: primaryTimeSlots,
      totalAmount,
      pricePerSlot,
      isWeekend,
      customerName,
      customerEmail,
      customerPhone,
      bookingReference: `BK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      paymentExpiry: paymentExpiry ? new Date(paymentExpiry) : undefined,
      paymentStatus,
      bookingStatus: finalBookingStatus,
    };

    // Add cross-midnight booking fields if present
    if (secondaryDate && secondaryTimeSlots && secondaryTimeSlots.length > 0) {
      bookingData.nextDayDate = secondaryDate;
      bookingData.nextDayTimeSlots = secondaryTimeSlots;
    }

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
    
    // Define cross-turf sports (Cricket, Football, and Functions&Events share same turf)
    const crossTurfSports = ["Cricket", "Football", "Functions and Events"];
    
    const dayStart = startOfDay(queryDate);
    const dayEnd = endOfDay(queryDate);

    // Build query for finding bookings
    let bookingQuery: any = {
      bookingStatus: "confirmed", // Only show confirmed bookings as booked
      // Payment status doesn't matter - confirmed is confirmed
      $or: [
        {
          date: {
            $gte: dayStart,
            $lte: dayEnd,
          },
        },
        {
          nextDayDate: {
            $gte: dayStart,
            $lte: dayEnd,
          },
        },
      ],
    };

    // If the selected sport is part of cross-turf sports, check all cross-turf sports
    if (crossTurfSports.includes(sport)) {
      bookingQuery.sport = { $in: crossTurfSports };
    } else {
      // For Badminton or others, check only that sport
      bookingQuery.sport = sport;
    }

    // For Shuttle Badminton, if court is specified, filter by court
    // If no court specified, return slots for ALL courts (for general availability)
    if (sport === "Shuttle Badminton" && court) {
      bookingQuery.court = court;
    }

    const bookings = await (Booking.find as any)(bookingQuery).select("timeSlots nextDayDate nextDayTimeSlots date court sport");

    // Fetch registered slots for monthly/quarterly/half yearly/yearly verified users
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
        subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] }, // All subscription types
        isActive: true,
        // Check if subscription is still valid
        subscriptionEndDate: { $gte: queryDate },
        "registeredSlots.0": { $exists: true }, // Has at least one registered slot
      };

      // If court is specified, filter by court
      if (court) {
        userQuery["registeredSlots.court"] = court;
      }

      const registeredUsers = await (User.find as any)(userQuery).select("registeredSlots preferredSport subscriptionType selectedCourt");

      // Extract registered slots for the specific day
      registeredUsers.forEach(user => {
        user.registeredSlots.forEach((slot: any) => {
          const slotCourt = slot.court || user.selectedCourt || 'S1';
          
          if (court) {
            // If specific court requested, only return slots for that court
            if (slotCourt === court) {
              registeredSlots.push(normalizeTimeSlot(slot.timeSlot));
            }
          } else {
            // Return all slots organized by court
            if (registeredCourtSlots[slotCourt]) {
              registeredCourtSlots[slotCourt].push(normalizeTimeSlot(slot.timeSlot));
            }
            registeredSlots.push(normalizeTimeSlot(slot.timeSlot));
          }
        });
      });

      // Remove duplicates
      registeredSlots = [...new Set(registeredSlots)];
      Object.keys(registeredCourtSlots).forEach(courtKey => {
        registeredCourtSlots[courtKey] = [...new Set(registeredCourtSlots[courtKey])];
      });
    } else if (crossTurfSports.includes(sport)) {
      // For cross-turf sports, also check registered users from any of the three sports
      let userQuery: any = {
        preferredSport: { $in: crossTurfSports },
        status: "verified", // Only verified users
        paymentStatus: { $in: ["completed", "confirmed"] }, // Only users with confirmed payments
        subscriptionType: { $in: ["monthly", "quarterly", "half yearly", "yearly"] }, // All subscription types
        isActive: true,
        // Check if subscription is still valid
        subscriptionEndDate: { $gte: queryDate },
        "registeredSlots.0": { $exists: true }, // Has at least one registered slot
      };

      const registeredUsers = await (User.find as any)(userQuery).select("registeredSlots preferredSport subscriptionType selectedCourt");

      // Extract registered slots for cross-turf sports
      registeredUsers.forEach(user => {
        user.registeredSlots.forEach((slot: any) => {
          // Only include if the user is registered for one of the cross-turf sports
          if (crossTurfSports.includes(user.preferredSport)) {
            registeredSlots.push(normalizeTimeSlot(slot.timeSlot));
          }
        });
      });

      // Remove duplicates
      registeredSlots = [...new Set(registeredSlots)];
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

        const hasSameDaySlots = booking.date && booking.date >= dayStart && booking.date <= dayEnd;
        const hasNextDaySlots = booking.nextDayDate && booking.nextDayDate >= dayStart && booking.nextDayDate <= dayEnd;

        if (courtBookings[bookingCourt]) {
          if (hasSameDaySlots) {
            courtBookings[bookingCourt].push(...expandStoredSlots(booking.timeSlots || []));
          }
          if (hasNextDaySlots) {
            courtBookings[bookingCourt].push(...expandStoredSlots(booking.nextDayTimeSlots || []));
          }
        }
      });

      // Remove duplicates for each court
      Object.keys(courtBookings).forEach(courtKey => {
        courtBookings[courtKey] = [...new Set(courtBookings[courtKey])];
      });

      return NextResponse.json({
        success: true,
        courtBookings, // Only actual booked slots - regardless of payment status
        bookedSlots: [], // Keep for backward compatibility
        registeredSlots: registeredCourtSlots, // Separate array for registered slots info
      });
    }

    // Extract all booked time slots (for other sports or specific court), including cross-midnight nextDay slots
    const bookedSlots = bookings.flatMap(booking => {
      const slots: string[] = [];
      const hasSameDaySlots = booking.date && booking.date >= dayStart && booking.date <= dayEnd;
      const hasNextDaySlots = booking.nextDayDate && booking.nextDayDate >= dayStart && booking.nextDayDate <= dayEnd;

      if (hasSameDaySlots) {
        slots.push(...expandStoredSlots(booking.timeSlots || []));
      }

      if (hasNextDaySlots) {
        slots.push(...expandStoredSlots(booking.nextDayTimeSlots || []));
      }

      return slots;
    });
    
    return NextResponse.json({
      success: true,
      bookedSlots: [...new Set(bookedSlots)], // Only actual booked slots - regardless of payment status
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

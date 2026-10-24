import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import Booking from "../../models/Booking";
import User from "../../models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/authConfig";
import { getISTDayRange, getISTDayStart, getISTTodayStart } from "@/app/lib/istDate";
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

function isEarlyMorningSlot(slot: string): boolean {
  const [startTime = ''] = String(slot || '').split(' - ');
  const [hoursStr = '0'] = startTime.split(':');
  const hours = Number(hoursStr);
  return Number.isFinite(hours) && hours >= 0 && hours < 5;
}

// POST - Create a new booking
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

    const { dayStart, dayEnd } = getISTDayRange(date);
    const queryDate = dayStart;
    const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const nextDayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
    
    // Define cross-turf sports (Cricket, Football, and Functions&Events share same turf)
    const crossTurfSports = ["Cricket", "Football", "Functions and Events"];
    
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

    const overlapNextDayQuery: any = {
      bookingStatus: "confirmed",
      date: {
        $gte: nextDayStart,
        $lte: nextDayEnd,
      },
    };

    if (crossTurfSports.includes(sport)) {
      overlapNextDayQuery.sport = { $in: crossTurfSports };
    } else {
      overlapNextDayQuery.sport = sport;
    }

    if (sport === "Shuttle Badminton" && court) {
      overlapNextDayQuery.court = court;
    }

    const overlapNextDayBookings = await (Booking.find as any)(overlapNextDayQuery).select("timeSlots date court");

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
      const nextDayCourtBookings: { [key: string]: string[] } = {
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

      overlapNextDayBookings.forEach((booking: any) => {
        const bookingCourt = booking.court || 'S1';
        if (nextDayCourtBookings[bookingCourt]) {
          nextDayCourtBookings[bookingCourt].push(
            ...expandStoredSlots(booking.timeSlots || []).filter(isEarlyMorningSlot)
          );
        }
      });

      // Remove duplicates for each court
      Object.keys(courtBookings).forEach(courtKey => {
        courtBookings[courtKey] = [...new Set(courtBookings[courtKey])];
      });
      Object.keys(nextDayCourtBookings).forEach(courtKey => {
        nextDayCourtBookings[courtKey] = [...new Set(nextDayCourtBookings[courtKey])];
      });

      return NextResponse.json({
        success: true,
        courtBookings, // Only actual booked slots - regardless of payment status
        nextDayCourtBookings,
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

    const nextDayEarlyBookedSlots = overlapNextDayBookings.flatMap((booking: any) =>
      expandStoredSlots(booking.timeSlots || []).filter(isEarlyMorningSlot)
    );
    
    return NextResponse.json({
      success: true,
      bookedSlots: [...new Set(bookedSlots)], // Only actual booked slots - regardless of payment status
      nextDayEarlyBookedSlots: [...new Set(nextDayEarlyBookedSlots)],
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

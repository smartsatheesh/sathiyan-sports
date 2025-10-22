import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

const COURT_CAPACITY = 4; // Maximum 4 users per court per time slot
const COURTS = ["S1", "S2", "S3"];

// Utility function to normalize time slot formats
function normalizeTimeSlot(timeSlot: string): string {
  if (!timeSlot) return timeSlot;
  
  // Convert "5:00 AM - 6:00 AM" to "05:00 AM - 06:00 AM" format
  return timeSlot.replace(/\b(\d):/g, '0$1:');
}

export async function POST(req: NextRequest) {
  try {
    await connectToMongoose();
    const { timeSlot, requestedCourt } = await req.json();

    if (!timeSlot) {
      return NextResponse.json(
        { success: false, message: "Time slot is required" },
        { status: 400 }
      );
    }

    // Normalize the requested time slot
    const normalizedTimeSlot = normalizeTimeSlot(timeSlot);
    console.log('🔍 Checking availability for:', timeSlot, '-> normalized:', normalizedTimeSlot, 'court:', requestedCourt);

    // Get all verified users with the same time slot from preferredTimeSlot
    const usersInSlot = await (User.find as any)({
      status: "verified",
      paymentStatus: "completed",
    });

    // Also get all users with registered slots for this time slot
    const usersWithRegisteredSlots = await (User.find as any)({
      "registeredSlots.timeSlot": { $exists: true },
      status: "verified",
      paymentStatus: "completed",
    });

    // Count bookings per court
    const courtBookings: { [key: string]: number } = {
      S1: 0,
      S2: 0,
      S3: 0,
    };

    // Count from preferredTimeSlot users
    usersInSlot.forEach((user: any) => {
      if (user.preferredTimeSlot && user.selectedCourt && COURTS.includes(user.selectedCourt)) {
        const normalizedUserTimeSlot = normalizeTimeSlot(user.preferredTimeSlot);
        if (normalizedUserTimeSlot === normalizedTimeSlot) {
          console.log('📅 PreferredTimeSlot match:', user.name, normalizedUserTimeSlot, 'court:', user.selectedCourt);
          courtBookings[user.selectedCourt]++;
        }
      }
    });

    // Count from registered slots (this is the critical part that was missing)
    usersWithRegisteredSlots.forEach((user: any) => {
      if (user.registeredSlots && Array.isArray(user.registeredSlots)) {
        user.registeredSlots.forEach((slot: any) => {
          if (slot.timeSlot && slot.court && COURTS.includes(slot.court)) {
            const normalizedSlotTimeSlot = normalizeTimeSlot(slot.timeSlot);
            if (normalizedSlotTimeSlot === normalizedTimeSlot) {
              console.log('🎯 RegisteredSlot match found!', user.name, slot.timeSlot, '-> normalized:', normalizedSlotTimeSlot, 'court:', slot.court);
              courtBookings[slot.court]++;
            }
          }
        });
      }
    });

    console.log('📊 Final court bookings:', courtBookings);

    // Create availability data with conflict details
    const availableCourts = COURTS.map(court => ({
      court,
      available: courtBookings[court] < COURT_CAPACITY,
      currentBookings: courtBookings[court],
      maxCapacity: COURT_CAPACITY,
    }));

    // Find available courts
    const freeCourts = availableCourts
      .filter(court => court.available)
      .map(court => court.court);

    let result = {
      success: true,
      canBook: false,
      message: "",
      availableCourts,
      suggestedCourts: [] as string[],
    };

    // Check if requested court is available
    if (requestedCourt) {
      const requestedCourtData = availableCourts.find(c => c.court === requestedCourt);
      
      if (requestedCourtData?.available) {
        result.canBook = true;
        result.message = `✅ Court ${requestedCourt} is available for ${timeSlot} (${requestedCourtData.currentBookings}/${COURT_CAPACITY} slots occupied)`;
        result.suggestedCourts = [requestedCourt];
      } else {
        const otherAvailable = freeCourts.filter(court => court !== requestedCourt);
        
        if (otherAvailable.length > 0) {
          result.canBook = false;
          result.message = `❌ Court ${requestedCourt} is not available for ${timeSlot} (${requestedCourtData?.currentBookings}/${COURT_CAPACITY} slots occupied - FULL). Available courts: ${otherAvailable.join(', ')}`;
          result.suggestedCourts = otherAvailable;
        } else {
          result.canBook = false;
          result.message = `❌ Court ${requestedCourt} is not available for ${timeSlot} (${requestedCourtData?.currentBookings}/${COURT_CAPACITY} slots occupied - FULL). All courts are occupied for this time slot.`;
          result.suggestedCourts = [];
        }
      }
    } else {
      // General availability check
      if (freeCourts.length > 0) {
        result.canBook = true;
        const courtDetails = freeCourts.map(court => {
          const courtData = availableCourts.find(c => c.court === court);
          return `${court} (${courtData?.currentBookings}/${COURT_CAPACITY})`;
        }).join(', ');
        result.message = `✅ Available courts for ${timeSlot}: ${courtDetails}`;
        result.suggestedCourts = freeCourts;
      } else {
        result.canBook = false;
        result.message = `❌ All courts are at full capacity (4/4 slots occupied) for ${timeSlot}. Please choose a different time slot.`;
        result.suggestedCourts = [];
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error checking court availability:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error checking court availability. Please try again.',
        canBook: false,
        availableCourts: [],
        suggestedCourts: []
      },
      { status: 500 }
    );
  }
}
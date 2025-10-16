import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

const COURT_CAPACITY = 4; // Maximum 4 users per court per time slot
const COURTS = ["S1", "S2", "S3"];

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

    // Get all verified users with the same time slot
    const usersInSlot = await (User.find as any)({
      preferredTimeSlot: timeSlot,
      status: "verified",
      paymentStatus: "completed",
    });

    // Count bookings per court
    const courtBookings: { [key: string]: number } = {
      S1: 0,
      S2: 0,
      S3: 0,
    };

    usersInSlot.forEach((user: any) => {
      if (user.selectedCourt && COURTS.includes(user.selectedCourt)) {
        courtBookings[user.selectedCourt]++;
      }
    });

    // Create availability data
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
        result.message = `Court ${requestedCourt} is available for ${timeSlot}`;
        result.suggestedCourts = [requestedCourt];
      } else {
        const otherAvailable = freeCourts.filter(court => court !== requestedCourt);
        
        if (otherAvailable.length > 0) {
          result.canBook = false;
          result.message = `Court ${requestedCourt} is fully booked for ${timeSlot}. Available courts: ${otherAvailable.join(', ')}`;
          result.suggestedCourts = otherAvailable;
        } else {
          result.canBook = false;
          result.message = `Court ${requestedCourt} and all other courts are fully booked for ${timeSlot}. Please choose a different time slot.`;
          result.suggestedCourts = [];
        }
      }
    } else {
      // General availability check
      if (freeCourts.length > 0) {
        result.canBook = true;
        result.message = `Available courts for ${timeSlot}: ${freeCourts.join(', ')}`;
        result.suggestedCourts = freeCourts;
      } else {
        result.canBook = false;
        result.message = `All courts are fully booked for ${timeSlot}. Please choose a different time slot.`;
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
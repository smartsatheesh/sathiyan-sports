import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "../../models/User";
import { format, startOfDay, endOfDay } from "date-fns";

// GET - Fetch registered slots for a specific date and sport
export async function GET(req: NextRequest) {
  try {
    await connectToMongoose();

    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const date = searchParams.get("date");
    const court = searchParams.get("court");

    if (!sport || !date) {
      return NextResponse.json(
        { message: "Sport and date parameters are required", success: false },
        { status: 400 }
      );
    }

    // Only check for registered slots for Shuttle Badminton
    if (sport !== "Shuttle Badminton") {
      return NextResponse.json({
        success: true,
        registeredSlots: [],
        courtRegistrations: {},
      });
    }

    const queryDate = new Date(date);
    const dayOfWeek = format(queryDate, "EEEE").toLowerCase(); // Get day of week (e.g., "monday")
    
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
    const registeredSlots: string[] = [];
    const courtRegistrations: { [key: string]: string[] } = {
      S1: [],
      S2: [],
      S3: []
    };

    registeredUsers.forEach(user => {
      user.registeredSlots.forEach((slot: any) => {
        if (slot.dayOfWeek === dayOfWeek) {
          const slotCourt = slot.court || user.selectedCourt || 'S1';
          
          // If specific court requested, only return slots for that court
          if (court) {
            if (slotCourt === court) {
              registeredSlots.push(slot.timeSlot);
            }
          } else {
            // Return all slots organized by court
            if (courtRegistrations[slotCourt]) {
              courtRegistrations[slotCourt].push(slot.timeSlot);
            }
            registeredSlots.push(slot.timeSlot);
          }
        }
      });
    });

    // Remove duplicates
    const uniqueRegisteredSlots = [...new Set(registeredSlots)];
    Object.keys(courtRegistrations).forEach(court => {
      courtRegistrations[court] = [...new Set(courtRegistrations[court])];
    });

    return NextResponse.json({
      success: true,
      registeredSlots: uniqueRegisteredSlots,
      courtRegistrations,
      dayOfWeek,
    });
  } catch (error) {
    console.error("Error fetching registered slots:", error);
    return NextResponse.json(
      { message: "Error fetching registered slots", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
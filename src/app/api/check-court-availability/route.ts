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

// Get current day of week in lowercase
function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

// Check if user's subscription is active
function isSubscriptionActive(user: any): boolean {
  if (!user.subscriptionEndDate) return false;
  
  const endDate = new Date(user.subscriptionEndDate);
  const now = new Date();
  
  return endDate > now;
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    
    const { timeSlot, requestedCourt, sport = "Shuttle Badminton", excludeUserId } = await request.json();
    
    if (!timeSlot) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Time slot is required',
          canBook: false,
          availableCourts: [],
          suggestedCourts: []
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking court availability:', { timeSlot, requestedCourt, sport, excludeUserId });

    // Normalize the time slot for consistent comparison
    const normalizedTimeSlot = normalizeTimeSlot(timeSlot);
    console.log('🔍 Normalized time slot:', normalizedTimeSlot);

    // Build query to find users with same sport, time slot (including pending users for real-time availability)
    const query: any = {
      preferredSport: sport,
      preferredTimeSlot: normalizedTimeSlot,
      selectedCourt: { $exists: true }, // Must have selected a court
      // Include all users regardless of verification status for real-time availability checking
      status: { $in: ['pending', 'verified'] }, // Exclude only rejected/suspended users
    };

    // Exclude the current user if provided (for edit scenarios)
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    console.log('🔍 MongoDB query:', query);

    // Find all users matching the criteria
    const existingUsers = await (User as any).find(query).lean();
    
    console.log(`📊 Found ${existingUsers.length} existing users for ${normalizedTimeSlot}:`, 
      existingUsers.map(u => ({ 
        name: u.name, 
        court: u.selectedCourt, 
        status: u.status, 
        paymentStatus: u.paymentStatus,
        champId: u.champId 
      }))
    );

    // Group users by court
    const courtBookings: Record<string, any[]> = {};
    
    existingUsers.forEach(user => {
      if (user.selectedCourt) {
        if (!courtBookings[user.selectedCourt]) {
          courtBookings[user.selectedCourt] = [];
        }
        courtBookings[user.selectedCourt].push(user);
      }
    });

    console.log('🏸 Court bookings breakdown:', Object.entries(courtBookings).map(([court, users]) => 
      `${court}: ${users.length}/${COURT_CAPACITY} (${users.map(u => u.name).join(', ')})`
    ));

    // Check availability for each court
    const availableCourts = COURTS.map(court => {
      const currentBookings = courtBookings[court]?.length || 0;
      return {
        court,
        currentBookings,
        maxCapacity: COURT_CAPACITY,
        available: currentBookings < COURT_CAPACITY,
        availableSlots: COURT_CAPACITY - currentBookings
      };
    });

    console.log('📋 Court availability status:', availableCourts);

    // Prepare response
    const result = {
      success: true,
      canBook: false,
      message: '',
      availableCourts,
      suggestedCourts: [] as any[]
    };

    if (requestedCourt) {
      // Check specific court availability
      const courtInfo = availableCourts.find(c => c.court === requestedCourt);
      
      if (courtInfo && courtInfo.available) {
        result.canBook = true;
        result.message = `✅ Court ${requestedCourt} is available for ${timeSlot}. ${courtInfo.availableSlots} slots remaining.`;
        result.suggestedCourts = [requestedCourt]; // Return court name, not object
      } else {
        result.canBook = false;
        result.message = `❌ Court ${requestedCourt} is fully booked for ${timeSlot} (${courtInfo?.currentBookings}/${COURT_CAPACITY} slots occupied).`;
        
        // Suggest alternative courts
        const alternativeCourts = availableCourts.filter(c => c.available);
        result.suggestedCourts = alternativeCourts.map(c => c.court); // Return court names, not objects
        
        if (alternativeCourts.length > 0) {
          const suggestions = alternativeCourts.map(c => `${c.court} (${c.availableSlots} slots)`).join(', ');
          result.message += ` Available alternatives: ${suggestions}`;
        } else {
          result.message += ' No alternative courts available for this time slot.';
        }
      }
    } else {
      // No specific court requested, find any available court
      const freeCourts = availableCourts.filter(c => c.available);
      
      if (freeCourts.length > 0) {
        result.canBook = true;
        const courtDetails = freeCourts.map(c => `${c.court} (${c.availableSlots} slots)`).join(', ');
        result.message = `✅ Available courts for ${timeSlot}: ${courtDetails}`;
        result.suggestedCourts = freeCourts.map(c => c.court); // Return court names, not objects
      } else {
        result.canBook = false;
        result.message = `❌ All courts are at full capacity (4/4 slots occupied) for ${timeSlot}. Please choose a different time slot.`;
        result.suggestedCourts = [];
      }
    }

    console.log('📤 Final result:', result);
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
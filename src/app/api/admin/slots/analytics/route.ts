import { NextRequest, NextResponse } from "next/server";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

interface SlotAnalytics {
  timeSlot: string;
  court: string;
  dayOfWeek: string;
  users: Array<{
    _id: string;
    name: string;
    email: string;
    mobile: string;
    registeredAt: string;
  }>;
  capacity: number;
  occupied: number;
  available: number;
}

const TIME_SLOTS = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM", 
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
  "08:00 PM - 09:00 PM",
  "09:00 PM - 10:00 PM",
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const COURTS = ['S1', 'S2', 'S3'];
const DEFAULT_CAPACITY = 6;

export async function POST(req: NextRequest) {
  try {
    await connectToMongoose();
    const { viewType, date, courts } = await req.json();

    if (!viewType || !date) {
      return NextResponse.json(
        { success: false, message: "View type and date are required" },
        { status: 400 }
      );
    }

    const selectedDate = new Date(date);
    const activeCourts = courts && courts.length > 0 ? courts : COURTS;

    console.log('🔍 Slot analytics request:', { viewType, date: selectedDate, activeCourts });

    // Get all verified badminton users with preferred slots
    const users = await (User as any).find({
      status: "verified",
      paymentStatus: "completed",
      preferredSport: "Shuttle Badminton",
      preferredTimeSlot: { $exists: true },
      selectedCourt: { $exists: true }
    }).select('name email mobile preferredTimeSlot selectedCourt preferredSport').lean();

    console.log(`📊 Found ${users.length} badminton users with preferred slots`);

    // Create a comprehensive slot analytics array
    const slotAnalytics: SlotAnalytics[] = [];

    // Generate all possible combinations
    for (const court of activeCourts) {
      for (const timeSlot of TIME_SLOTS) {
        for (const dayOfWeek of DAYS_OF_WEEK) {
          // Find users for this specific slot (simplified approach)
          const slotUsers = users.filter(user => 
            user.selectedCourt === court &&
            user.preferredTimeSlot === timeSlot
            // Note: dayOfWeek is not stored in user preferences in simplified model
          ).map(user => {
            return {
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
              mobile: user.mobile,
              registeredAt: new Date().toISOString(), // Use current date as fallback
            };
          });

          const capacity = DEFAULT_CAPACITY;
          const occupied = slotUsers.length;
          const available = capacity - occupied;

          // Only include slots that have at least one user or if we want to show empty slots
          if (occupied > 0 || viewType === 'monthly') {
            slotAnalytics.push({
              timeSlot,
              court,
              dayOfWeek,
              users: slotUsers,
              capacity,
              occupied,
              available,
            });
          }
        }
      }
    }

    // Filter by date range if needed
    let filteredSlots = slotAnalytics;
    if (viewType === 'weekly') {
      // For weekly view, we show all days but could filter by week context
      // Currently showing all registered slots regardless of specific week
      filteredSlots = slotAnalytics.filter(slot => slot.occupied > 0);
    } else if (viewType === 'monthly') {
      // For monthly view, show all slots for better overview
      filteredSlots = slotAnalytics;
    }

    // Sort by day of week, then by time slot
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    filteredSlots.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      
      const timeA = TIME_SLOTS.indexOf(a.timeSlot);
      const timeB = TIME_SLOTS.indexOf(b.timeSlot);
      if (timeA !== timeB) return timeA - timeB;
      
      return a.court.localeCompare(b.court);
    });

    console.log(`📈 Returning ${filteredSlots.length} slot analytics`);

    return NextResponse.json({
      success: true,
      slots: filteredSlots,
      metadata: {
        totalSlots: filteredSlots.length,
        totalUsers: users.length,
        viewType,
        dateRange: viewType === 'weekly' 
          ? `${format(startOfWeek(selectedDate), 'yyyy-MM-dd')} to ${format(endOfWeek(selectedDate), 'yyyy-MM-dd')}`
          : `${format(startOfMonth(selectedDate), 'yyyy-MM-dd')} to ${format(endOfMonth(selectedDate), 'yyyy-MM-dd')}`,
        activeCourts,
      }
    });

  } catch (error) {
    console.error('Error fetching slot analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching slot analytics. Please try again.',
        slots: []
      },
      { status: 500 }
    );
  }
}
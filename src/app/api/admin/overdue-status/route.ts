import { NextRequest, NextResponse } from "next/server";
import BillingCycleService from "@/app/services/BillingCycleService";

// POST - Update overdue status for all users
export async function POST(req: NextRequest) {
  try {
    await BillingCycleService.updateOverdueStatus();

    return NextResponse.json({
      success: true,
      message: "Overdue status updated for all users"
    });

  } catch (error) {
    console.error("Error updating overdue status:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to update overdue status", 
        success: false 
      },
      { status: 500 }
    );
  }
}

// GET - Get overdue users
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    if (type === 'upcoming') {
      const daysAhead = parseInt(url.searchParams.get('days') || '7');
      const users = await BillingCycleService.getUsersWithUpcomingDueDates(daysAhead);
      
      return NextResponse.json({
        success: true,
        users,
        count: users.length,
        type: 'upcoming'
      });
    } else {
      const users = await BillingCycleService.getOverdueUsers();
      
      return NextResponse.json({
        success: true,
        users,
        count: users.length,
        type: 'overdue'
      });
    }

  } catch (error) {
    console.error("Error fetching overdue users:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to fetch overdue users", 
        success: false 
      },
      { status: 500 }
    );
  }
}
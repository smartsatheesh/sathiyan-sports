import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/server/mongodb";
import User from "@/app/models/User";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const limit = parseInt(searchParams.get('limit') || '8');

    if (!sport) {
      return NextResponse.json(
        { error: "Sport parameter is required" },
        { status: 400 }
      );
    }

    // Find users with the specified preferred sport
    const users = await (User as any).find(
      { 
        preferredSport: sport,
        isActive: true 
      },
      {
        champId: 1,
        name: 1,
        preferredSport: 1,
        champType: 1,
        subscribed: 1,
        hasActiveSubscription: 1,
        createdAt: 1
      }
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error("Error fetching users by sport:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
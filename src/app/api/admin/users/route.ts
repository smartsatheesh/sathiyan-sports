import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch all users (for admin)
export async function GET(req: NextRequest) {
  try {
    await connectToMongoose();

    // Extract search params directly from NextRequest
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const search = req.nextUrl.searchParams.get("search");

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await (User.find as any)(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v"); // Exclude version field

    const total = await (User.countDocuments as any)(query);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Error fetching users", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

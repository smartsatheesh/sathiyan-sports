import { NextRequest, NextResponse } from "next/server";
import connectDB from "../../../server/Mongo";
import Contact from "../../../models/Contact";

// GET - Fetch all contacts (for admin)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    const query: any = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    // Get status statistics
    const statusStats = await Contact.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
      stats: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as Record<string, number>)
    });

  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch contacts", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update contact status
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { contactId, status } = body;

    if (!contactId || !status) {
      return NextResponse.json(
        { success: false, message: "Contact ID and status are required" },
        { status: 400 }
      );
    }

    if (!['new', 'read', 'replied'].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    const contact = await Contact.findByIdAndUpdate(
      contactId,
      { status },
      { new: true }
    );

    if (!contact) {
      return NextResponse.json(
        { success: false, message: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contact status updated successfully",
      contact
    });

  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update contact", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

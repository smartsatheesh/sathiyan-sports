import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from "../../../models/Booking";
import { canManageBookings, canSeeMoney } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';

// Money fields a coach never receives or changes
const MONEY_FIELDS = '-totalAmount -refundAmount -paymentId -paymentMethod -transactionId -utr';

// GET - Fetch all bookings (admin sees everything; a coach sees bookings without amounts)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(canManageBookings);
    if (!auth.ok) return auth.response;
    await connectToMongoose();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const sport = searchParams.get("sport");

    const query: Record<string, any> = {};
    if (status) query.bookingStatus = status;
    if (sport) query.sport = sport;

    const skip = (page - 1) * limit;

    const bookings = await (Booking.find as any)(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(canSeeMoney(auth.role) ? '' : MONEY_FIELDS);

    const total = await (Booking.countDocuments as any)(query);

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { message: "Error fetching bookings", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT - Update booking status (payment status is the owner's call)
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireRole(canManageBookings);
    if (!auth.ok) return auth.response;
    const body = await req.json();
    await connectToMongoose();

    const { bookingId, status } = body;
    const paymentStatus = canSeeMoney(auth.role) ? body.paymentStatus : undefined;

    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required", success: false },
        { status: 400 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.bookingStatus = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const booking = await (Booking.findByIdAndUpdate as any)(
      bookingId,
      updateData,
      { new: true }
    );

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Booking updated successfully",
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { message: "Error updating booking", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

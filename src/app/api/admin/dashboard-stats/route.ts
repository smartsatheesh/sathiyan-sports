import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../../models/User";
import Booking from "../../../models/Booking";
import FitnessEnrollment from "../../../models/FitnessEnrollment";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToMongoose();

    // Get total counts without pagination
    const totalUsers = await (User.countDocuments as any)({});
    const totalBookings = await (Booking.countDocuments as any)({});
    
    // Get today's bookings count
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todaysBookings = await (Booking.countDocuments as any)({
      createdAt: {
        $gte: todayStart,
        $lt: todayEnd
      }
    });

    // Calculate total revenue from completed bookings
    const revenueResult = await (Booking.aggregate as any)([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get recent bookings for dashboard display (last 10)
    const recentBookings = await (Booking.find as any)({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get recent users for dashboard display (last 10)
    const recentUsers = await (User.find as any)({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-password -__v")
      .lean();

    // Get user status distribution
    const userStatusCounts = await (User.aggregate as any)([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get booking status distribution
    const bookingStatusCounts = await (Booking.aggregate as any)([
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get fitness enrollment statistics
    const totalFitnessEnrollments = await (FitnessEnrollment.countDocuments as any)({});
    
    // Get active fitness enrollments
    const activeFitnessEnrollments = await (FitnessEnrollment.countDocuments as any)({
      status: 'active'
    });

    // Calculate total fitness revenue from completed payments
    const fitnessRevenueResult = await (FitnessEnrollment.aggregate as any)([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalFitnessRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalFitnessRevenue = fitnessRevenueResult.length > 0 ? fitnessRevenueResult[0].totalFitnessRevenue : 0;

    // Get recent fitness enrollments for dashboard display (last 10)
    const recentFitnessEnrollments = await (FitnessEnrollment.find as any)({})
      .sort({ enrollmentDate: -1 })
      .limit(10)
      .lean();

    // Get fitness plan popularity
    const fitnessPlanPopularity = await (FitnessEnrollment.aggregate as any)([
      {
        $group: {
          _id: '$planCategory',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get fitness enrollment status distribution
    const fitnessStatusCounts = await (FitnessEnrollment.aggregate as any)([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get sport popularity
    const sportPopularity = await (User.aggregate as any)([
      {
        $group: {
          _id: '$preferredSport',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalBookings,
        todaysBookings,
        totalRevenue,
        totalFitnessEnrollments,
        activeFitnessEnrollments,
        totalFitnessRevenue
      },
      recentBookings,
      recentUsers,
      recentFitnessEnrollments,
      analytics: {
        userStatusCounts,
        bookingStatusCounts,
        sportPopularity,
        fitnessPlanPopularity,
        fitnessStatusCounts
      }
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error fetching dashboard statistics", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
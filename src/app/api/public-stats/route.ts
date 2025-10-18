import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import User from "../../models/User";
import Booking from "../../models/Booking";
import FitnessEnrollment from "../../models/FitnessEnrollment";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch public statistics for homepage
export async function GET() {
  try {
    await connectToMongoose();

    // Get total counts for public display
    const totalUsers = await (User.countDocuments as any)({
      status: { $in: ['verified', 'active'] } // Only count verified/active users
    });
    
    const totalBookings = await (Booking.countDocuments as any)({
      paymentStatus: 'completed' // Only completed bookings
    });
    
    const totalFitnessEnrollments = await (FitnessEnrollment.countDocuments as any)({
      status: { $in: ['active', 'completed'] } // Only active/completed enrollments
    });

    // Calculate total events (assuming functions and events bookings)
    const totalEvents = await (Booking.countDocuments as any)({
      sport: 'Functions and Events',
      paymentStatus: 'completed'
    });

    // Get average rating (if you have a reviews collection, otherwise use fixed 4.8)
    const averageRating = 4.8; // You can replace this with actual calculation if you have reviews

    // Calculate some growth metrics
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    
    const usersThisYear = await (User.countDocuments as any)({
      createdAt: { $gte: yearStart },
      status: { $in: ['verified', 'active'] }
    });

    const bookingsThisYear = await (Booking.countDocuments as any)({
      createdAt: { $gte: yearStart },
      paymentStatus: 'completed'
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalBookings,
        totalEvents,
        totalFitnessEnrollments,
        averageRating,
        usersThisYear,
        bookingsThisYear,
        // Additional stats for homepage display
        yearsOfService: new Date().getFullYear() - 2023, // Assuming started in 2023
        sportsOffered: 4, // Cricket, Football, Badminton, Functions & Events
        availability: '24/7'
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    
    // Return fallback stats in case of error
    return NextResponse.json({
      success: false,
      stats: {
        totalUsers: 50, // Fallback numbers
        totalBookings: 150,
        totalEvents: 25,
        totalFitnessEnrollments: 30,
        averageRating: 4.8,
        usersThisYear: 25,
        bookingsThisYear: 75,
        yearsOfService: 1,
        sportsOffered: 4,
        availability: '24/7'
      }
    });
  }
}
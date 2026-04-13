import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import FitnessEnrollment from "../../../models/FitnessEnrollment";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch fitness enrollments for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'coach')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToMongoose();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    try {
      // Get total count
      const totalEnrollments = await (FitnessEnrollment.countDocuments as any)({});
      
      // Get paginated fitness enrollments
      const enrollments = await (FitnessEnrollment.find as any)({})
        .sort({ enrollmentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(totalEnrollments / limit);

      return NextResponse.json({
        success: true,
        enrollments,
        pagination: {
          page,
          limit,
          total: totalEnrollments,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Database error occurred", 
          error: dbError instanceof Error ? dbError.message : "Unknown database error" 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error fetching fitness enrollments:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error fetching fitness enrollments", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
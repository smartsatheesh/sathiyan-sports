import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import User from '@/app/models/User';
import AttendanceRecord from '@/app/models/AttendanceRecord';

export const dynamic = 'force-dynamic';

// GET - Fetch students for attendance marking
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'coach')) {
      return NextResponse.json(
        { error: 'Unauthorized. Coach or Admin access required.' },
        { status: 403 }
      );
    }

    await connectToMongoose();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const sport = searchParams.get('sport');
    const timeSlot = searchParams.get('timeSlot');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Build query for students
    const query: any = {
      subscribed: 'yes',
      paymentStatus: 'completed'
    };

    if (sport) {
      query.preferredSport = sport;
    }

    if (timeSlot) {
      query.preferredTimeSlot = timeSlot;
    }

    // Fetch students matching criteria
    const students = await (User.find as any)(query)
      .select('_id champId name email preferredSport preferredTimeSlot')
      .lean();

    // Fetch existing attendance records for this date
    const attendanceQuery: any = { date };
    if (sport) attendanceQuery.sport = sport;
    if (timeSlot) attendanceQuery.timeSlot = timeSlot;

    const existingRecords = await (AttendanceRecord.find as any)(attendanceQuery)
      .lean();

    // Map existing records for quick lookup
    const recordMap = new Map();
    existingRecords.forEach((record: any) => {
      recordMap.set(record.champId, record);
    });

    // Merge student data with attendance records
    const studentsWithAttendance = students.map((student: any) => ({
      _id: student._id,
      champId: student.champId,
      name: student.name,
      email: student.email,
      sport: student.preferredSport,
      timeSlot: student.preferredTimeSlot,
      isPresent: recordMap.has(student.champId) ? recordMap.get(student.champId).isPresent : false,
      notes: recordMap.has(student.champId) ? recordMap.get(student.champId).notes : ''
    }));

    // Get available sports and time slots
    const allStudents = await (User.find as any)(query).select('preferredSport preferredTimeSlot').lean();
    const sports = [...new Set(allStudents.map((s: any) => s.preferredSport))];
    const timeSlots = [...new Set(allStudents.map((s: any) => s.preferredTimeSlot))];

    return NextResponse.json({
      success: true,
      date,
      sport: sport || null,
      timeSlot: timeSlot || null,
      students: studentsWithAttendance,
      filters: {
        sports,
        timeSlots
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST - Mark attendance for students
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'coach')) {
      return NextResponse.json(
        { error: 'Unauthorized. Coach or Admin access required.' },
        { status: 403 }
      );
    }

    await connectToMongoose();

    const body = await req.json();
    const { date, attendanceRecords } = body;

    if (!date || !Array.isArray(attendanceRecords)) {
      return NextResponse.json(
        { error: 'Date and attendance records are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const results = [];

    for (const record of attendanceRecords) {
      const { champId, studentName, studentEmail, sport, timeSlot, isPresent, notes } = record;

      if (!champId || !studentName || !studentEmail || !sport || !timeSlot) {
        continue;
      }

      // Upsert attendance record
      const updatedRecord = await (AttendanceRecord.findOneAndUpdate as any)(
        { date, champId },
        {
          date,
          champId,
          studentName,
          studentEmail,
          sport,
          timeSlot,
          isPresent,
          notes: notes || '',
          markedBy: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role
          },
          markedAt: new Date()
        },
        { upsert: true, new: true }
      );

      results.push(updatedRecord);
    }

    return NextResponse.json({
      success: true,
      message: `Marked attendance for ${results.length} students`,
      count: results.length
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}

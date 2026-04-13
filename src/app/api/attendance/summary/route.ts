import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import AttendanceRecord from '@/app/models/AttendanceRecord';

export const dynamic = 'force-dynamic';

// GET - Fetch attendance summary for a date
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
    const date = searchParams.get('date');
    const sport = searchParams.get('sport');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const query: any = { date };
    if (sport) query.sport = sport;

    const records = await (AttendanceRecord.find as any)(query).lean();

    // Calculate statistics
    const totalStudents = records.length;
    const presentCount = records.filter((r: any) => r.isPresent).length;
    const absentCount = totalStudents - presentCount;
    const percentagePresent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    // Group by sport
    const byEvent: any = {};
    records.forEach((record: any) => {
      const key = record.sport;
      if (!byEvent[key]) {
        byEvent[key] = { total: 0, present: 0, absent: 0 };
      }
      byEvent[key].total += 1;
      if (record.isPresent) {
        byEvent[key].present += 1;
      } else {
        byEvent[key].absent += 1;
      }
    });

    return NextResponse.json({
      success: true,
      date,
      summary: {
        total: totalStudents,
        present: presentCount,
        absent: absentCount,
        percentagePresent
      },
      bySport: byEvent,
      records
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    );
  }
}

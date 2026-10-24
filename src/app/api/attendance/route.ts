import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';
import User from '@/app/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const isStaff = session.user.role === 'admin' || session.user.role === 'coach';

    const url = new URL(request.url);
    let champId = url.searchParams.get('champId');
    const date = url.searchParams.get('date');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50') || 50, 1), 200);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1') || 1, 1);

    // Members only ever see their own records
    if (!isStaff) {
      const me = await (User.findById as any)(session.user.id).select('champId').lean();
      if (!me?.champId) {
        return NextResponse.json({ success: true, data: [], pagination: { current: 1, total: 0, hasNext: false, hasPrev: false, totalRecords: 0 } });
      }
      champId = me.champId;
    }
    
    let query: any = {};
    
    if (champId) {
      query.champId = champId.toUpperCase();
    }
    
    if (date) {
      query.date = date;
    }
    
    const skip = (page - 1) * limit;
    
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate({
          path: 'champId',
          select: 'name email phone',
          model: 'User',
          localField: 'champId',
          foreignField: 'champId'
        })
        .sort({ date: -1, loginTime: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        totalRecords: total
      }
    });
    
  } catch (error: any) {
    console.error('Get attendance records error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch attendance records'
      },
      { status: 500 }
    );
  }
}
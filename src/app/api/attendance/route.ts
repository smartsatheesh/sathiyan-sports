import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/server/mongodb';
import Attendance from '@/app/models/Attendance';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    const url = new URL(request.url);
    const champId = url.searchParams.get('champId');
    const date = url.searchParams.get('date');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
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
        message: 'Failed to fetch attendance records',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
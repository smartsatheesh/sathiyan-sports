import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../server/mongodb';
import Tournament from '../../models/Tournament';
import Player from '../../models/Player';
import Match from '../../models/Match';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/authConfig';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const status = searchParams.get('status');
    
    let query: any = {};
    
    if (sport && sport !== 'all') {
      query.sport = sport;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const tournaments = await (Tournament.find as any)(query)
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 });

    return NextResponse.json({
      success: true,
      data: tournaments
    });

  } catch (error) {
    console.error('Get tournaments error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournaments'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    await connectToDatabase();
    const User = (await import('../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      sport,
      type,
      description,
      registrationFee,
      prizePool,
      maxParticipants,
      registrationDeadline,
      startDate,
      endDate,
      venue,
      category
    } = body;

    // Validate required fields
    if (!name || !sport || !type || !startDate || !venue) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, sport, type, startDate, venue'
        },
        { status: 400 }
      );
    }

    const newTournament = new Tournament({
      name,
      sport,
      type,
      description,
      registrationFee: registrationFee || 0,
      prizePool: prizePool || 0,
      maxParticipants: maxParticipants || 32,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      venue,
      category: category || 'Open',
      createdBy: user._id,
      status: 'upcoming'
    });

    await newTournament.save();
    
    const populatedTournament = await (Tournament.findById as any)(newTournament._id)
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: populatedTournament,
      message: 'Tournament created successfully'
    });

  } catch (error) {
    console.error('Create tournament error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tournament'
      },
      { status: 500 }
    );
  }
}
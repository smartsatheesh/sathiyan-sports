import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../server/mongodb';
import Tournament from '../../../../models/Tournament';
import Player from '../../../../models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const User = (await import('../../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const tournament = await (Tournament.findById as any)(params.id);
    
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if registration is still open
    if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
      return NextResponse.json(
        { success: false, error: 'Registration deadline has passed' },
        { status: 400 }
      );
    }

    // Check if tournament is full
    const currentPlayers = await Player.countDocuments({ tournamentId: params.id });
    
    if (tournament.type === 'doubles') {
      // For doubles, count pairs
      const registeredPairs = Math.floor(currentPlayers / 2);
      const maxPairs = Math.floor(tournament.maxParticipants / 2);
      
      if (registeredPairs >= maxPairs) {
        return NextResponse.json(
          { success: false, error: 'Tournament is full' },
          { status: 400 }
        );
      }
    } else if (currentPlayers >= tournament.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Tournament is full' },
        { status: 400 }
      );
    }

    // Check if user is already registered
    const existingRegistration = await (Player.findOne as any)({
      tournamentId: params.id,
      userId: user._id
    });

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'You are already registered for this tournament' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { partner, category } = body;

    // For doubles, validate partner info
    if (tournament.type === 'doubles' && !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner information is required for doubles tournament' },
        { status: 400 }
      );
    }

    const newPlayer = new Player({
      tournamentId: params.id,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      partner: partner || null,
      category: category || tournament.category,
      registrationFee: tournament.registrationFee,
      paymentStatus: tournament.registrationFee > 0 ? 'pending' : 'completed'
    });

    await newPlayer.save();

    const populatedPlayer = await (Player.findById as any)(newPlayer._id)
      .populate('userId', 'name email phone')
      .populate('tournamentId', 'name sport type');

    return NextResponse.json({
      success: true,
      data: populatedPlayer,
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Register player error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register for tournament'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const players = await (Player.find as any)({ tournamentId: params.id })
      .populate('userId', 'name email phone')
      .sort({ registeredAt: 1 });

    return NextResponse.json({
      success: true,
      data: players
    });

  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch players'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../server/mongodb';
import Match from '../../../../models/Match';
import Tournament from '../../../../models/Tournament';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const round = searchParams.get('round');
    const status = searchParams.get('status');
    
    let query: any = { tournamentId: params.id };
    
    if (round && round !== 'all') {
      query.round = round;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const matches = await (Match.find as any)(query)
      .populate('player1Id player2Id', 'name partner userId')
      .populate('winner', 'name partner')
      .sort({ matchNumber: 1 });

    // Group matches by round for better organization
    const matchesByRound = matches.reduce((acc: any, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        matches,
        matchesByRound,
        stats: {
          total: matches.length,
          scheduled: matches.filter(m => m.status === 'scheduled').length,
          live: matches.filter(m => m.status === 'live').length,
          completed: matches.filter(m => m.status === 'completed').length,
          cancelled: matches.filter(m => m.status === 'cancelled').length
        }
      }
    });

  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch matches'
      },
      { status: 500 }
    );
  }
}

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
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const tournament = await (Tournament.findById as any)(params.id);
    
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      round,
      matchNumber,
      player1Id,
      player2Id,
      player1Name,
      player2Name,
      player1Partner,
      player2Partner,
      category,
      courtNumber,
      scheduledTime
    } = body;

    // Validate required fields — player IDs are optional (admin creates by name)
    if (!round || !matchNumber || !player1Name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: round, matchNumber, player1Name'
        },
        { status: 400 }
      );
    }

    const newMatch = new Match({
      tournamentId: params.id,
      round,
      matchNumber,
      ...(player1Id && player1Id !== 'dummy-id' ? { player1Id } : {}),
      ...(player2Id && player2Id !== 'dummy-id' ? { player2Id } : {}),
      player1Name,
      player2Name,
      player1Partner,
      player2Partner,
      category: category || tournament.category,
      courtNumber,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      status: 'scheduled',
      score: {
        player1Sets: 0,
        player2Sets: 0,
        sets: []
      },
      points: {
        player1Points: 0,
        player2Points: 0
      }
    });

    await newMatch.save();

    const populatedMatch = await (Match.findById as any)(newMatch._id)
      .populate('player1Id player2Id', 'name partner userId');

    return NextResponse.json({
      success: true,
      data: populatedMatch,
      message: 'Match created successfully'
    });

  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create match'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    await connectToDatabase();
    const User = (await import('../../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

    const result = await (Match.deleteMany as any)({ tournamentId: params.id });
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Delete all matches error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete matches' }, { status: 500 });
  }
}
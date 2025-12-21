import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../server/mongodb';
import Match from '../../../../../models/Match';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/authConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    await connectToDatabase();

    const match = await (Match.findById as any)(params.matchId)
      .populate('player1Id player2Id', 'name partner userId')
      .populate('winner', 'name partner');

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.tournamentId.toString() !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Match does not belong to this tournament' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: match
    });

  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch match'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const User = (await import('../../../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const match = await (Match.findById as any)(params.matchId);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.tournamentId.toString() !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Match does not belong to this tournament' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      status,
      score,
      winner,
      winnerName,
      duration,
      notes,
      liveScore,
      courtNumber,
      scheduledTime
    } = body;

    // Update allowed fields
    if (status !== undefined) {
      match.status = status;
    }
    
    if (score !== undefined) {
      match.score = {
        ...match.score,
        ...score
      };
    }

    if (winner !== undefined) {
      match.winner = winner;
    }

    if (winnerName !== undefined) {
      match.winnerName = winnerName;
    }

    if (duration !== undefined) {
      match.duration = duration;
    }

    if (notes !== undefined) {
      match.notes = notes;
    }

    if (liveScore !== undefined) {
      match.liveScore = {
        ...match.liveScore,
        ...liveScore
      };
    }

    if (courtNumber !== undefined) {
      match.courtNumber = courtNumber;
    }

    if (scheduledTime !== undefined) {
      match.scheduledTime = scheduledTime ? new Date(scheduledTime) : null;
    }

    // Auto-complete match if winner is set and status is not already completed
    if (winner && match.status !== 'completed') {
      match.status = 'completed';
    }

    await match.save();

    const updatedMatch = await (Match.findById as any)(params.matchId)
      .populate('player1Id player2Id', 'name partner userId')
      .populate('winner', 'name partner');

    return NextResponse.json({
      success: true,
      data: updatedMatch,
      message: 'Match updated successfully'
    });

  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update match'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
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
    const User = (await import('../../../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const match = await (Match.findById as any)(params.matchId);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.tournamentId.toString() !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Match does not belong to this tournament' },
        { status: 400 }
      );
    }

    await (Match.findByIdAndDelete as any)(params.matchId);

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('Delete match error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete match'
      },
      { status: 500 }
    );
  }
}
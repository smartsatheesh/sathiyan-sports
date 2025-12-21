import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../server/mongodb';
import Tournament from '../../../models/Tournament';
import Player from '../../../models/Player';
import Match from '../../../models/Match';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const tournament = await (Tournament.findById as any)(params.id)
      .populate('createdBy', 'name email');

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get registered players
    const players = await (Player.find as any)({ tournamentId: params.id })
      .populate('userId', 'name email phone')
      .sort({ registeredAt: 1 });

    // Get matches
    const matches = await (Match.find as any)({ tournamentId: params.id })
      .populate('player1Id player2Id', 'name partner userId')
      .sort({ matchNumber: 1 });

    return NextResponse.json({
      success: true,
      data: {
        tournament,
        players,
        matches,
        stats: {
          totalPlayers: players.length,
          registrationProgress: tournament.maxParticipants > 0 ? 
            (players.length / tournament.maxParticipants) * 100 : 0,
          completedMatches: matches.filter(m => m.status === 'completed').length,
          liveMatches: matches.filter(m => m.status === 'live').length,
          upcomingMatches: matches.filter(m => m.status === 'scheduled').length
        }
      }
    });

  } catch (error) {
    console.error('Get tournament error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournament'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const User = (await import('../../../models/User')).default;
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
    
    // Update allowed fields
    const updateFields = [
      'name', 'description', 'registrationFee', 'prizePool', 
      'maxParticipants', 'registrationDeadline', 'startDate', 
      'endDate', 'venue', 'category', 'status'
    ];

    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field.includes('Date')) {
          tournament[field] = new Date(body[field]);
        } else {
          tournament[field] = body[field];
        }
      }
    });

    await tournament.save();

    const updatedTournament = await (Tournament.findById as any)(params.id)
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: updatedTournament,
      message: 'Tournament updated successfully'
    });

  } catch (error) {
    console.error('Update tournament error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tournament'
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
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const User = (await import('../../../models/User')).default;
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

    // Delete related data
    await (Player.deleteMany as any)({ tournamentId: params.id });
    await (Match.deleteMany as any)({ tournamentId: params.id });
    await (Tournament.findByIdAndDelete as any)(params.id);

    return NextResponse.json({
      success: true,
      message: 'Tournament deleted successfully'
    });

  } catch (error) {
    console.error('Delete tournament error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete tournament'
      },
      { status: 500 }
    );
  }
}
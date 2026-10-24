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
    // ---------------------------------------------------------
    // 1. Check authentication
    // ---------------------------------------------------------
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Connect to database
    // ---------------------------------------------------------
    await connectToDatabase();

    // ---------------------------------------------------------
    // 3. Check admin access
    // ---------------------------------------------------------
    const User = (await import('../../../../../models/User')).default;

    const user = await (User.findOne as any)({
      email: session.user.email
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required'
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 4. Find the match
    // ---------------------------------------------------------
    const match = await (Match.findById as any)(params.matchId);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: 'Match not found'
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 5. Make sure match belongs to tournament
    // ---------------------------------------------------------
    if (match.tournamentId.toString() !== params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Match does not belong to this tournament'
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 6. Read request body
    // ---------------------------------------------------------
    const body = await request.json();

    const {
      round,
      matchNumber,

      player1Name,
      player2Name,
      player1Partner,
      player2Partner,

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

    // ---------------------------------------------------------
    // 7. UPDATE ROUND
    // ---------------------------------------------------------
    if (round !== undefined) {
      match.round = round;
    }

    // ---------------------------------------------------------
    // 8. UPDATE MATCH NUMBER
    // ---------------------------------------------------------
    if (matchNumber !== undefined) {
      match.matchNumber = matchNumber;
    }

    // ---------------------------------------------------------
    // 9. UPDATE PLAYER 1 NAME
    // ---------------------------------------------------------
    if (player1Name !== undefined) {
      match.player1Name = player1Name;
    }

    // ---------------------------------------------------------
    // 10. UPDATE PLAYER 2 NAME
    // ---------------------------------------------------------
    if (player2Name !== undefined) {
      match.player2Name = player2Name;
    }

    // ---------------------------------------------------------
    // 11. UPDATE PLAYER 1 PARTNER
    // ---------------------------------------------------------
    if (player1Partner !== undefined) {
      match.player1Partner = player1Partner;
    }

    // ---------------------------------------------------------
    // 12. UPDATE PLAYER 2 PARTNER
    // ---------------------------------------------------------
    if (player2Partner !== undefined) {
      match.player2Partner = player2Partner;
    }

    // ---------------------------------------------------------
    // 13. UPDATE STATUS
    // ---------------------------------------------------------
    if (status !== undefined) {
      match.status = status;
    }

    // ---------------------------------------------------------
    // 14. UPDATE SCORE
    // ---------------------------------------------------------
    if (score !== undefined) {
      match.score = {
        ...(match.score || {}),
        ...score
      };
    }

    // ---------------------------------------------------------
    // 15. UPDATE WINNER ID
    // ---------------------------------------------------------
    if (winner !== undefined) {
      match.winner = winner;
    }

    // ---------------------------------------------------------
    // 16. UPDATE WINNER NAME
    // ---------------------------------------------------------
    if (winnerName !== undefined) {
      match.winnerName = winnerName;
    }

    // ---------------------------------------------------------
    // 17. UPDATE DURATION
    // ---------------------------------------------------------
    if (duration !== undefined) {
      match.duration = duration;
    }

    // ---------------------------------------------------------
    // 18. UPDATE NOTES
    // ---------------------------------------------------------
    if (notes !== undefined) {
      match.notes = notes;
    }

    // ---------------------------------------------------------
    // 19. UPDATE LIVE SCORE
    // ---------------------------------------------------------
    if (liveScore !== undefined) {
      match.liveScore = {
        ...(match.liveScore || {}),
        ...liveScore
      };
    }

    // ---------------------------------------------------------
    // 20. UPDATE COURT NUMBER
    // ---------------------------------------------------------
    if (courtNumber !== undefined) {
      match.courtNumber = courtNumber;
    }

    // ---------------------------------------------------------
    // 21. UPDATE SCHEDULED TIME
    // ---------------------------------------------------------
    if (scheduledTime !== undefined) {
      match.scheduledTime = scheduledTime
        ? new Date(scheduledTime)
        : null;
    }

    // ---------------------------------------------------------
    // 22. Automatically mark completed when winner exists
    // ---------------------------------------------------------
    if (
      winnerName !== undefined &&
      winnerName !== null &&
      winnerName !== ''
    ) {
      match.status = 'completed';
    }

    // ---------------------------------------------------------
    // 23. SAVE CURRENT MATCH FIRST
    // ---------------------------------------------------------
    await match.save();

    // ---------------------------------------------------------
    // 24. ADVANCE WINNER TO NEXT MATCH
    // ---------------------------------------------------------
    if (
      winnerName !== undefined &&
      winnerName !== null &&
      winnerName !== '' &&
      match.nextMatchNumber
    ) {
      const nextMatch = await (Match.findOne as any)({
        tournamentId: match.tournamentId,
        matchNumber: match.nextMatchNumber
      });

      if (nextMatch) {
        const slot = match.nextMatchSlot;

        // -----------------------------------------------------
        // Determine winner partner
        //
        // IMPORTANT:
        // We use the UPDATED player names/partners from `match`
        // -----------------------------------------------------
        let winnerPartner = '';

        if (winnerName === match.player1Name) {
          winnerPartner = match.player1Partner || '';
        } else if (winnerName === match.player2Name) {
          winnerPartner = match.player2Partner || '';
        }

        // -----------------------------------------------------
        // Put winner into correct slot
        // -----------------------------------------------------
        if (slot === 'player1') {
          nextMatch.player1Name = winnerName;
          nextMatch.player1Partner = winnerPartner;
        } else if (slot === 'player2') {
          nextMatch.player2Name = winnerName;
          nextMatch.player2Partner = winnerPartner;
        }

        await nextMatch.save();

        console.log(
          `Bracket advanced: ${winnerName} -> Match ${match.nextMatchNumber} (${slot})`
        );
      } else {
        console.warn(
          `Next match not found: ${match.nextMatchNumber}`
        );
      }
    }

    // ---------------------------------------------------------
    // 25. GET UPDATED MATCH WITH POPULATED DATA
    // ---------------------------------------------------------
    const updatedMatch = await (Match.findById as any)(
      params.matchId
    )
      .populate(
        'player1Id player2Id',
        'name partner userId'
      )
      .populate(
        'winner',
        'name partner'
      );

    // ---------------------------------------------------------
    // 26. RETURN SUCCESS
    // ---------------------------------------------------------
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
        error: 'Failed to update match',
        details:
          error instanceof Error
            ? error.message
            : String(error)
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
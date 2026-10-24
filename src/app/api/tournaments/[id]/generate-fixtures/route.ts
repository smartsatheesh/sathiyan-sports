import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../server/mongodb';
import Match from '../../../../models/Match';
import Player from '../../../../models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';
import { buildKnockoutBracket, BracketTeam } from '../../../../lib/bracket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();
    const User = (await import('../../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const tournamentId = params.id;

    // Fetch registered players sorted by registration date (earliest = seed 1)
    const players = await (Player.find as any)({ tournamentId })
      .sort({ registeredAt: 1, createdAt: 1 })
      .lean();

    if (players.length < 2) {
      return NextResponse.json({ success: false, error: 'At least 2 registered players/teams are required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const force = (body as any).force === true;
    const existingCount = await (Match.countDocuments as any)({ tournamentId });
    if (existingCount > 0 && !force) {
      return NextResponse.json({
        success: false,
        error: `${existingCount} matches already exist. Send { "force": true } to regenerate.`,
      }, { status: 409 });
    }
    if (existingCount > 0) {
      await (Match.deleteMany as any)({ tournamentId });
    }

    // Group registrations by their registered category — each category becomes its own
    // independently-sized bracket (Group A, Group B, ...), dynamic to however many
    // categories/teams were actually registered.
    const groupNames: string[] = Array.from(
      new Set(players.map((p: any) => (p.category && String(p.category).trim()) || 'Open'))
    ) as string[];
    groupNames.sort((a, b) => a.localeCompare(b));

    const allDocs: any[] = [];
    const summary: Array<{ group: string; category: string; teams: number; matches: number; rounds: string[] }> = [];
    let matchCursor = 1;

    for (let g = 0; g < groupNames.length; g++) {
      const category = groupNames[g];
      const groupLetter = String.fromCharCode(65 + g); // A, B, C, D...
      const groupPlayers = players.filter(
        (p: any) => ((p.category && String(p.category).trim()) || 'Open') === category
      );

      const teams: BracketTeam[] = groupPlayers.map((p: any, idx: number) => ({
        name: p.name,
        partner: p.partnerName || p.partner || '',
        teamId: `${groupLetter}${idx + 1}`,
      }));

      if (teams.length < 2) {
        summary.push({ group: groupLetter, category, teams: teams.length, matches: 0, rounds: [] });
        continue;
      }

      const { matches, nextMatchNumber } = buildKnockoutBracket(teams, matchCursor);
      matchCursor = nextMatchNumber;

      for (const m of matches) {
        allDocs.push({
          tournamentId,
          category, // group this match belongs to (dynamic, based on registrations)
          round: m.round,
          matchNumber: m.matchNumber,
          player1Name: m.player1Name,
          player1Partner: m.player1Partner,
          player1TeamId: m.player1TeamId,
          player2Name: m.player2Name,
          player2Partner: m.player2Partner,
          player2TeamId: m.player2TeamId,
          status: 'scheduled',
          score: { player1Sets: 0, player2Sets: 0, sets: [] },
          nextMatchNumber: m.nextMatchNumber,
          nextMatchSlot: m.nextMatchSlot,
        });
      }

      summary.push({
        group: groupLetter,
        category,
        teams: teams.length,
        matches: matches.length,
        rounds: Array.from(new Set(matches.map((m) => m.round))),
      });
    }

    if (allDocs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No group has enough teams (min 2) to generate a bracket',
      }, { status: 400 });
    }

    await (Match.insertMany as any)(allDocs);

    return NextResponse.json({
      success: true,
      message: `Generated ${allDocs.length} matches across ${summary.filter(s => s.matches > 0).length} group(s)`,
      matchesCreated: allDocs.length,
      groups: summary,
    });
  } catch (error) {
    console.error('Generate fixtures error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate fixtures' }, { status: 500 });
  }
}


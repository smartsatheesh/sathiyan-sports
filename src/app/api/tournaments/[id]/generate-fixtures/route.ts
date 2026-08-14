import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../server/mongodb';
import Match from '../../../../models/Match';
import Player from '../../../../models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';

// Bracket wiring: matchNumber → { nextMatchNumber, nextMatchSlot }
const BRACKET: Record<number, { next: number; slot: 'player1' | 'player2' }> = {
  1:  { next: 10, slot: 'player1' },
  2:  { next: 11, slot: 'player1' },
  3:  { next: 12, slot: 'player1' },
  4:  { next: 13, slot: 'player1' },
  5:  { next: 14, slot: 'player1' },
  6:  { next: 15, slot: 'player1' },
  7:  { next: 16, slot: 'player1' },
  8:  { next: 17, slot: 'player1' },
  9:  { next: 17, slot: 'player2' },
  10: { next: 18, slot: 'player1' },
  11: { next: 18, slot: 'player2' },
  12: { next: 19, slot: 'player1' },
  13: { next: 19, slot: 'player2' },
  14: { next: 20, slot: 'player1' },
  15: { next: 20, slot: 'player2' },
  16: { next: 21, slot: 'player1' },
  17: { next: 21, slot: 'player2' },
  18: { next: 22, slot: 'player1' },
  19: { next: 22, slot: 'player2' },
  20: { next: 23, slot: 'player1' },
  21: { next: 23, slot: 'player2' },
  22: { next: 24, slot: 'player1' },
  23: { next: 24, slot: 'player2' },
  // Match 24 (Final) has no next match
};

const ROUND_LABELS: Record<number, string> = {
  1: 'Preliminary', 2: 'Preliminary', 3: 'Preliminary',
  4: 'Preliminary', 5: 'Preliminary', 6: 'Preliminary',
  7: 'Preliminary', 8: 'Preliminary', 9: 'Preliminary',
  10: 'Round of 16', 11: 'Round of 16', 12: 'Round of 16', 13: 'Round of 16',
  14: 'Round of 16', 15: 'Round of 16', 16: 'Round of 16', 17: 'Round of 16',
  18: 'Quarter Final', 19: 'Quarter Final', 20: 'Quarter Final', 21: 'Quarter Final',
  22: 'Semi Final', 23: 'Semi Final',
  24: 'Final',
};

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

    // Fetch registered players sorted by registration date (I1 = earliest)
    const players = await (Player.find as any)({ tournamentId })
      .sort({ registeredAt: 1, createdAt: 1 })
      .lean();

    if (players.length < 1) {
      return NextResponse.json({ success: false, error: 'No registered players found' }, { status: 400 });
    }

    // Map team index (1-based) to player record
    const team = (idx: number) => players[idx - 1] as any;
    const teamName = (idx: number) => {
      const p = team(idx);
      return p ? p.name : `Team ${idx}`;
    };
    const teamPartner = (idx: number) => {
      const p = team(idx);
      return p ? (p.partnerName || p.partner || '') : '';
    };

    // Check for existing fixtures
    const body = await request.json().catch(() => ({}));
    const force = (body as any).force === true;
    const existingCount = await (Match.countDocuments as any)({ tournamentId });
    if (existingCount > 0 && !force) {
      return NextResponse.json({
        success: false,
        error: `${existingCount} matches already exist. Send { "force": true } to regenerate.`,
      }, { status: 409 });
    }

    // Clear existing matches for clean regeneration
    if (existingCount > 0) {
      await (Match.deleteMany as any)({ tournamentId });
    }

    // Define all 24 match fixtures
    // Preliminary matches have real team names; later rounds start as TBD
    const fixtures = [
      // --- Preliminary Round ---
      { n: 1,  p1i: 1,  p2i: 25 },
      { n: 2,  p1i: 2,  p2i: 24 },
      { n: 3,  p1i: 3,  p2i: 23 },
      { n: 4,  p1i: 4,  p2i: 17 },
      { n: 5,  p1i: 5,  p2i: 21 },
      { n: 6,  p1i: 6,  p2i: 20 },
      { n: 7,  p1i: 7,  p2i: 19 },
      { n: 8,  p1i: 8,  p2i: 18 },
      { n: 9,  p1i: 9,  p2i: 22 },
      // --- Round of 16: slots filled by winner advancement or direct seeding ---
      // M10: Winner M1 vs I10 (I10 is direct)
      { n: 10, p1i: null, p2i: 10, label: 'M10' },
      { n: 11, p1i: null, p2i: 11, label: 'M11' },
      { n: 12, p1i: null, p2i: 12, label: 'M12' },
      { n: 13, p1i: null, p2i: 13, label: 'M13' },
      { n: 14, p1i: null, p2i: 14, label: 'M14' },
      { n: 15, p1i: null, p2i: 15, label: 'M15' },
      { n: 16, p1i: null, p2i: 16, label: 'M16' },
      { n: 17, p1i: null, p2i: null, label: 'M17' }, // Both from Prelim winners
      // --- Quarter Finals ---
      { n: 18, p1i: null, p2i: null, label: 'QF1' },
      { n: 19, p1i: null, p2i: null, label: 'QF2' },
      { n: 20, p1i: null, p2i: null, label: 'QF3' },
      { n: 21, p1i: null, p2i: null, label: 'QF4' },
      // --- Semi Finals ---
      { n: 22, p1i: null, p2i: null, label: 'SF1' },
      { n: 23, p1i: null, p2i: null, label: 'SF2' },
      // --- Final ---
      { n: 24, p1i: null, p2i: null, label: 'Final' },
    ];

    const docs = fixtures.map(({ n, p1i, p2i }) => {
      const wire = BRACKET[n];
      const p1 = p1i != null ? team(p1i) : null;
      const p2 = p2i != null ? team(p2i) : null;
      const p1label = p1i != null ? `I${p1i}` : 'TBD';
      const p2label = p2i != null ? `I${p2i}` : 'TBD';
      return {
        tournamentId,
        round: ROUND_LABELS[n],
        matchNumber: n,
        player1Name: p1 ? teamName(p1i!) : p1label,
        player1Partner: p1 ? teamPartner(p1i!) : '',
        player1TeamId: p1label,
        player2Name: p2 ? teamName(p2i!) : p2label,
        player2Partner: p2 ? teamPartner(p2i!) : '',
        player2TeamId: p2label,
        status: 'scheduled',
        score: { player1Sets: 0, player2Sets: 0, sets: [] },
        nextMatchNumber: wire?.next ?? null,
        nextMatchSlot: wire?.slot ?? null,
      };
    });

    await (Match.insertMany as any)(docs);

    return NextResponse.json({
      success: true,
      message: `Generated ${docs.length} matches for the knockout bracket`,
      matchesCreated: docs.length,
    });
  } catch (error) {
    console.error('Generate fixtures error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate fixtures' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../server/mongodb';
import Match from '../../../../models/Match';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authConfig';

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

    const { round, category } = await request.json();
    if (!round) {
      return NextResponse.json({ success: false, error: 'Round is required' }, { status: 400 });
    }

    const tournamentId = params.id;
    const query: Record<string, any> = { tournamentId, round };
    if (category) query.category = category;
    const roundMatches = await (Match.find as any)(query).sort({ matchNumber: 1 });

    if (roundMatches.length === 0) {
      return NextResponse.json({ success: false, error: 'No matches found for this round' }, { status: 404 });
    }

    // Refuse to shuffle a round that has already started or finished — reseeding
    // live/completed results would corrupt scores and bracket advancement.
    const started = roundMatches.filter((m: any) => m.status === 'live' || m.status === 'completed');
    if (started.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot shuffle: ${started.length} match(es) in this round have already started or completed.`,
      }, { status: 409 });
    }

    // Collect known (non-TBD) team slots from both sides of every match in the round.
    // TBD slots are winner-advancement placeholders and are left untouched.
    type Slot = { name: string; partner: string; teamId: string };
    const slots: Slot[] = [];
    for (const m of roundMatches) {
      if (m.player1Name && m.player1Name !== 'TBD') {
        slots.push({ name: m.player1Name, partner: m.player1Partner || '', teamId: m.player1TeamId || '' });
      }
      if (m.player2Name && m.player2Name !== 'TBD') {
        slots.push({ name: m.player2Name, partner: m.player2Partner || '', teamId: m.player2TeamId || '' });
      }
    }

    if (slots.length < 2) {
      return NextResponse.json({ success: false, error: 'Not enough known teams in this round to shuffle' }, { status: 400 });
    }

    const shuffled = shuffle(slots);
    let cursor = 0;
    for (const m of roundMatches) {
      const hasP1 = m.player1Name && m.player1Name !== 'TBD';
      const hasP2 = m.player2Name && m.player2Name !== 'TBD';
      if (hasP1) {
        const s = shuffled[cursor++];
        m.player1Name = s.name;
        m.player1Partner = s.partner;
        m.player1TeamId = s.teamId;
      }
      if (hasP2) {
        const s = shuffled[cursor++];
        m.player2Name = s.name;
        m.player2Partner = s.partner;
        m.player2TeamId = s.teamId;
      }
      await m.save();
    }

    return NextResponse.json({
      success: true,
      message: `Reshuffled ${slots.length} teams across ${roundMatches.length} matches in ${category ? `${category} — ` : ''}${round}`,
    });
  } catch (error) {
    console.error('Shuffle round error:', error);
    return NextResponse.json({ success: false, error: 'Failed to shuffle round' }, { status: 500 });
  }
}

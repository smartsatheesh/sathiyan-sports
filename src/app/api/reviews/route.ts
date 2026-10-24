import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import Review from '@/app/models/Review';
import User from '@/app/models/User';

export const dynamic = 'force-dynamic';

const SPORT_LABEL: Record<string, string> = { 'Shuttle Badminton': 'Badminton', Football: 'Football', Cricket: 'Cricket' };

/** "Priya Sundaram" -> "Priya S." — first name + initial keeps members' privacy */
function shortName(name: string) {
  const [first, ...rest] = String(name || 'Member').trim().split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : '';
  return `${first}${initial}`.slice(0, 40);
}

// GET: approved reviews for the homepage; ?mine=1 returns the signed-in member's own review
export async function GET(request: NextRequest) {
  await connectToMongoose();
  if (request.nextUrl.searchParams.get('mine') === '1') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Please log in' }, { status: 401 });
    const review = await (Review.findOne as any)({ userId: session.user.id }).select('rating text status').lean();
    return NextResponse.json({ success: true, review });
  }

  const reviews = await (Review.find as any)({ status: 'approved' })
    .sort({ updatedAt: -1 })
    .limit(9)
    .select('displayName label rating text updatedAt')
    .lean();
  const agg = await (Review.aggregate as any)([
    { $match: { status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return NextResponse.json(
    { success: true, reviews, average: agg[0]?.avg ? Math.round(agg[0].avg * 10) / 10 : null, count: agg[0]?.count || 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}

// POST { rating, text }: a member writes or updates their review (goes back to pending)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Please log in' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rating = Math.round(Number(body.rating));
  const text = String(body.text || '').trim();
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ success: false, error: 'Tap a star rating' }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ success: false, error: 'Please write at least a sentence' }, { status: 400 });

  await connectToMongoose();
  const user = await (User.findById as any)(session.user.id).select('name preferredSport champType').lean();
  if (!user) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });

  const sport = SPORT_LABEL[user.preferredSport] || '';
  const label = [sport, user.champType === 'kids' ? 'parent of a young player' : 'member'].filter(Boolean).join(' · ');

  await (Review.findOneAndUpdate as any)(
    { userId: session.user.id },
    { $set: { displayName: shortName(user.name), label, rating, text: text.slice(0, 300), status: 'pending' } },
    { upsert: true }
  );
  return NextResponse.json({ success: true, message: 'Thank you! Your review will appear once the academy approves it.' });
}

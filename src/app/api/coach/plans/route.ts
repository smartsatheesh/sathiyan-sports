import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { connectToMongoose } from '@/app/server/mongodb';
import CoachPlan from '@/app/models/CoachPlan';
import { CoachLimitError, createPlan, parseInputs } from '@/app/lib/coach.server';
import { AIUnavailableError } from '@/app/lib/gemini.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // plan generation can take a while

// GET: my plans (newest first). Staff can pass ?all=1 to see every member's recent plans.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Please log in' }, { status: 401 });

  const isStaff = session.user.role === 'admin' || session.user.role === 'coach';
  const all = isStaff && request.nextUrl.searchParams.get('all') === '1';

  await connectToMongoose();
  const plans = await (CoachPlan.find as any)(all ? {} : { userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(all ? 100 : 10)
    .select('plan.title inputs createdAt userName progress')
    .lean();
  return NextResponse.json({
    success: true,
    plans: plans.map((p: any) => ({ ...p, progress: undefined, ticks: Object.keys(p.progress || {}).length })),
  });
}

// POST: create a new plan from the wizard answers
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Please log in' }, { status: 401 });

  const inputs = parseInputs(await request.json().catch(() => null));
  if (!inputs) return NextResponse.json({ success: false, error: 'Please answer all the questions' }, { status: 400 });

  try {
    const doc = await createPlan(session.user, inputs);
    return NextResponse.json({ success: true, id: doc._id });
  } catch (error) {
    if (error instanceof CoachLimitError) return NextResponse.json({ success: false, error: error.message }, { status: 429 });
    if (error instanceof AIUnavailableError) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    console.error('Coach plan generation failed:', error);
    return NextResponse.json({ success: false, error: 'The coach is busy right now. Please try again in a minute.' }, { status: 502 });
  }
}

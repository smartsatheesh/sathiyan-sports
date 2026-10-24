import { NextRequest, NextResponse } from 'next/server';
import { loadPlan } from '@/app/lib/coachAccess.server';
import { chatWithCoach, CoachLimitError } from '@/app/lib/coach.server';
import { AIUnavailableError } from '@/app/lib/gemini.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST { message } — ask the coach about (or to change) this plan
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { doc, error } = await loadPlan(params.id);
  if (error) return error;

  const message = String((await request.json().catch(() => ({})))?.message || '').trim().slice(0, 500);
  if (!message) return NextResponse.json({ success: false, error: 'Type a question first' }, { status: 400 });

  try {
    const result = await chatWithCoach(doc, message);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof CoachLimitError) return NextResponse.json({ success: false, error: err.message }, { status: 429 });
    if (err instanceof AIUnavailableError) return NextResponse.json({ success: false, error: err.message }, { status: 503 });
    console.error('Coach chat failed:', err);
    return NextResponse.json({ success: false, error: 'The coach is busy right now. Please try again.' }, { status: 502 });
  }
}

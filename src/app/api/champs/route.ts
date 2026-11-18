import { NextResponse } from 'next/server';
import { weeklyChamps } from '@/app/lib/customers.server';

export const dynamic = 'force-dynamic';

/** Public: the week's booking champs for the home page (names and masked mobiles only). */
export async function GET() {
  try {
    const champs = await weeklyChamps(5);
    return NextResponse.json(
      { success: true, champs },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    console.error('Champs error:', error);
    return NextResponse.json({ success: false, champs: [] }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/app/lib/settings.server';
import { DEFAULT_SETTINGS } from '@/app/lib/pricing';

export const dynamic = 'force-dynamic';

// Public: prices, UPI details and WhatsApp number used by every page
export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ success: true, settings }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }
}

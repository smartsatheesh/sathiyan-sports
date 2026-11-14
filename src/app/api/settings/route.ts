import { NextResponse } from 'next/server';
import { getClubSettings } from '@/app/lib/clubs.server';
import { tenantFromRequest } from '@/app/lib/tenant.server';
import { DEFAULT_SETTINGS } from '@/app/lib/pricing';

export const dynamic = 'force-dynamic';

// Public: prices, UPI details and WhatsApp number used by every page — for the club whose
// site this is (the middleware sets the tenant from the host name)
export async function GET(request: Request) {
  try {
    const settings = await getClubSettings(tenantFromRequest(request));
    return NextResponse.json({ success: true, settings }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }
}

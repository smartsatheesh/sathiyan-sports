import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { saveSettingsDoc, settingsKeyFor, validateSettings } from '@/app/lib/settings.server';
import { getClubSettings, invalidatePublicClub, scopeClub } from '@/app/lib/clubs.server';
import { tenantFromRequest } from '@/app/lib/tenant.server';
import { isDefaultClub } from '@/app/lib/clubs';
import { withDefaults } from '@/app/lib/pricing';

export const dynamic = 'force-dynamic';

/** Which club's settings this request edits: club admins their own; the owner the club whose site this is, or ?club=. */
async function clubFor(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const requested = request.nextUrl.searchParams.get('club') || tenantFromRequest(request);
  const club = scopeClub(session?.user, requested);
  return { session, club };
}

export async function GET(request: NextRequest) {
  const { club } = await clubFor(request);
  if (!club) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  const settings = await getClubSettings(club);
  return NextResponse.json({ success: true, settings, club });
}

export async function PUT(request: NextRequest) {
  const { session, club } = await clubFor(request);
  if (!session || !club) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });

  try {
    const body = await request.json();
    const settings = withDefaults(body?.settings);
    // A partner club may run without court booking, so it needn't list any court prices
    const errors = validateSettings(settings, { allowNoCourts: !isDefaultClub(club) });
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }
    await saveSettingsDoc(settingsKeyFor(club), settings, session.user.name || session.user.mobile || 'admin');
    invalidatePublicClub(club);
    const saved = await getClubSettings(club);
    return NextResponse.json({ success: true, settings: saved, club });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}

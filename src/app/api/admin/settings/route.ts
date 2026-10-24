import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authConfig';
import { getSiteSettings, saveSiteSettings, validateSettings } from '@/app/lib/settings.server';
import { withDefaults } from '@/app/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const settings = withDefaults(body?.settings);
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
    }
    const saved = await saveSiteSettings(settings, session.user.name || session.user.mobile || 'admin');
    return NextResponse.json({ success: true, settings: saved });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}

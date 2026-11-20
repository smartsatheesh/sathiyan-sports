import { NextRequest, NextResponse } from 'next/server';
import { canManageFinance } from '@/app/lib/roles';
import { requireRole } from '@/app/lib/roles.server';
import { getFinanceSettings, saveFinanceSettings } from '@/app/lib/finance.server';
import { validateFinanceSettings, withFinanceDefaults } from '@/app/lib/finance';

export const dynamic = 'force-dynamic';

// Sathiyan Finance rules: default rates per tenure, penalty, WhatsApp texts. Owner only.
export async function GET() {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ success: true, settings: await getFinanceSettings() });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(canManageFinance);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Invalid settings' }, { status: 400 });
  const settings = withFinanceDefaults(body);
  const errors = validateFinanceSettings(settings);
  if (errors.length) return NextResponse.json({ success: false, error: errors[0], errors }, { status: 400 });
  await saveFinanceSettings(settings, auth.userId);
  return NextResponse.json({ success: true, settings });
}

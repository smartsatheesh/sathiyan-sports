import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authConfig';
import { connectToDatabase } from '../../../server/mongodb';
import Player from '../../../models/Player';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    const User = (await import('../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get('tournamentId') || '';
    const paymentChoice = searchParams.get('paymentChoice') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const source = searchParams.get('source') || 'public';
    const search = (searchParams.get('search') || '').trim();
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const query: Record<string, any> = {};

    if (tournamentId && tournamentId !== 'all') {
      query.tournamentId = tournamentId;
    }

    if (paymentChoice !== 'all') {
      query.paymentChoice = paymentChoice;
    }

    if (paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (source !== 'all') {
      query.registrationSource = source;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
      ];
    }

    const registrations = await (Player.find as any)(query)
      .populate('tournamentId', 'name sport startDate venue')
      .sort({ createdAt: -1 })
      .lean();

    const normalized = registrations.map((item: any) => {
      const inferredChoice = item.paymentChoice || (item.paymentStatus === 'completed' ? 'pay_now' : 'pay_later');
      return {
        id: String(item._id),
        tournamentId: item.tournamentId?._id ? String(item.tournamentId._id) : '',
        tournamentName: item.tournamentId?.name || 'Unknown Tournament',
        sport: item.tournamentId?.sport || '-',
        venue: item.tournamentId?.venue || '-',
        startDate: item.tournamentId?.startDate || null,
        name: item.name || '-',
        clubName: item.clubName || '-',
        phone: item.phone || item.mobile || '-',
        sex: item.sex || '-',
        category: item.category || '-',
        eventType: item.eventType || '-',
        registrationFee: Number(item.registrationFee || 0),
        paymentChoice: inferredChoice,
        paymentStatus: item.paymentStatus || 'pending',
        transactionId: item.transactionId || item.championshipId || '-',
        registrationSource: item.registrationSource || 'user',
        registeredAt: item.registeredAt || item.registrationDate || item.createdAt || null,
      };
    });

    if (format === 'csv') {
      const headers = [
        'Registered At',
        'Tournament',
        'Sport',
        'Venue',
        'Name',
        'Phone',
        'Sex',
        'Category',
        'Event Type',
        'Registration Fee',
        'Payment Choice',
        'Payment Status',
        'Transaction ID',
        'Source',
      ];

      const rows = normalized.map((row: any) => [
        row.registeredAt ? new Date(row.registeredAt).toLocaleString('en-GB') : '-',
        row.tournamentName,
        row.sport,
        row.venue,
        row.name,
        row.phone,
        row.sex,
        row.category,
        row.eventType,
        row.registrationFee,
        row.paymentChoice,
        row.paymentStatus,
        row.transactionId,
        row.registrationSource,
      ]);

      const csv = [headers, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=tournament-registrations-${Date.now()}.csv`,
        },
      });
    }

    const summary = {
      total: normalized.length,
      payNow: normalized.filter((r: any) => r.paymentChoice === 'pay_now').length,
      payLater: normalized.filter((r: any) => r.paymentChoice === 'pay_later').length,
      completed: normalized.filter((r: any) => r.paymentStatus === 'completed').length,
      pending: normalized.filter((r: any) => r.paymentStatus === 'pending').length,
    };

    return NextResponse.json({
      success: true,
      registrations: normalized,
      summary,
    });
  } catch (error) {
    console.error('Admin tournament registrations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tournament registrations' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();
    const User = (await import('../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });

    const allowed = ['name', 'phone', 'partnerName', 'sex', 'category', 'eventType', 'paymentChoice', 'paymentStatus', 'transactionId'];
    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    const updated = await (Player.findByIdAndUpdate as any)(id, { $set: sanitized }, { new: true });
    if (!updated) return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Registration updated' });
  } catch (error) {
    console.error('Admin tournament registration PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update registration' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();
    const User = (await import('../../../models/User')).default;
    const user = await (User.findOne as any)({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tournamentId = searchParams.get('tournamentId');

    // Bulk delete all registrations for a tournament
    if (tournamentId && searchParams.get('deleteAll') === 'true') {
      const result = await (Player.deleteMany as any)({ tournamentId });
      return NextResponse.json({ success: true, deleted: result.deletedCount });
    }

    if (!id) return NextResponse.json({ success: false, error: 'Registration ID required' }, { status: 400 });

    const deleted = await (Player.findByIdAndDelete as any)(id);
    if (!deleted) return NextResponse.json({ success: false, error: 'Registration not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Registration deleted' });
  } catch (error) {
    console.error('Admin tournament registration DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete registration' }, { status: 500 });
  }
}

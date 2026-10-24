import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '../../../server/mongodb';
import Tournament from '../../../models/Tournament';
import Player from '../../../models/Player';
import { getSiteSettings } from '@/app/lib/settings.server';

const VALID_AGE_CATEGORIES = ['20 to 40 Adult', '40 plus Veteran'];
const VALID_EVENT_TYPES = ['Singles', 'Doubles', 'Mixed Doubles'];

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();

    const body = await request.json();
    const {
      tournamentId,
      name,
      phone,
      clubName,
      partnerName,
      sex,
      ageCategory,
      eventType,
      paymentChoice,
    } = body;

    if (!tournamentId || !name || !phone || !sex || !ageCategory || !eventType || !paymentChoice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['Male', 'Female', 'Other'].includes(sex)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sex value' },
        { status: 400 }
      );
    }

    if (!VALID_AGE_CATEGORIES.includes(ageCategory)) {
      return NextResponse.json(
        { success: false, error: 'Invalid age category' },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      );
    }

    if (!['pay_now', 'pay_later'].includes(paymentChoice)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment choice' },
        { status: 400 }
      );
    }

    const normalizedPhone = String(phone).replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    const tournament = await (Tournament.findById as any)(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'upcoming') {
      return NextResponse.json(
        { success: false, error: 'Registration is closed for this tournament' },
        { status: 400 }
      );
    }

    if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
      return NextResponse.json(
        { success: false, error: 'Registration deadline has passed' },
        { status: 400 }
      );
    }

    const maxParticipants = Number(tournament.maxParticipants || tournament.maxPlayers || 40);
    const currentPlayers = await (Player.countDocuments as any)({ tournamentId });
    if (currentPlayers >= maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Tournament is full' },
        { status: 400 }
      );
    }

    // Normalize to last 10 digits to handle +91 prefix variants
    const last10 = normalizedPhone.slice(-10);
    const existingRegistration = await (Player.findOne as any)({
      tournamentId,
      $or: [
        { mobile: { $in: [normalizedPhone, last10, `91${last10}`, `+91${last10}`] } },
        { phone: { $in: [normalizedPhone, last10, `91${last10}`, `+91${last10}`] } },
      ],
    });

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'This phone number is already registered for this tournament' },
        { status: 400 }
      );
    }

    // Fee comes from the tournament (or the default in settings); payment proof is
    // submitted separately via /api/payments and confirmed by an admin.
    const registrationFee = Number(tournament.registrationFee) > 0
      ? Number(tournament.registrationFee)
      : (await getSiteSettings()).tournamentDefaultFee;

    const player = new Player({
      tournamentId,
      name: String(name).trim(),
      phone: normalizedPhone,
      mobile: normalizedPhone,
      clubName: clubName ? String(clubName).trim() : undefined,
      partnerName: partnerName ? String(partnerName).trim() : undefined,
      category: ageCategory,
      sex,
      eventType,
      isRegisteredUser: false,
      registrationFee,
      paymentChoice,
      registrationSource: 'public',
      registeredAt: new Date(),
      paymentStatus: 'pending',
    });

    await player.save();

    return NextResponse.json({
      success: true,
      message: 'Tournament registration successful',
      data: {
        registrationId: String(player._id),
        tournamentName: tournament.name,
        name: player.name,
        phone: player.mobile,
        sex,
        category: ageCategory,
        eventType,
        registrationFee,
        paymentChoice,
        paymentStatus: player.paymentStatus,
      },
    });
  } catch (error) {
    console.error('Public tournament registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register for tournament' },
      { status: 500 }
    );
  }
}

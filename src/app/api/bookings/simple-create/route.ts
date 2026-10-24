import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authConfig';
import { addDaysFromISTDayStart, getISTDayStart, getISTTodayStart } from '@/app/lib/istDate';
import { findBlockingConflicts } from '@/app/lib/bookingConflicts';
import { getSiteSettings } from '@/app/lib/settings.server';
import { calculateBookingPrice, getCourt } from '@/app/lib/pricing';

function parseTimeSlots(timeSlot?: string, timeSlots?: string[]): string[] {
  if (Array.isArray(timeSlots) && timeSlots.length > 0) {
    return [...new Set(timeSlots.map((slot) => slot.trim()).filter(Boolean))];
  }

  if (!timeSlot) return [];
  return [...new Set(timeSlot.split(',').map((slot) => slot.trim()).filter(Boolean))];
}

function splitCrossMidnightSlots(slots: string[]): {
  spansMidnight: boolean;
  sameDaySlots: string[];
  nextDaySlots: string[];
} {
  const earlyMorningSlots: string[] = [];
  const regularSlots: string[] = [];

  slots.forEach((slot) => {
    const [start] = slot.split(' - ');
    const [hourText] = (start || '').split(':');
    const hour = Number(hourText);

    if (!Number.isNaN(hour) && hour >= 0 && hour < 5) {
      earlyMorningSlots.push(slot);
    } else {
      regularSlots.push(slot);
    }
  });

  const spansMidnight = regularSlots.length > 0 && earlyMorningSlots.length > 0;

  if (!spansMidnight) {
    return {
      spansMidnight: false,
      sameDaySlots: slots,
      nextDaySlots: [],
    };
  }

  return {
    spansMidnight: true,
    sameDaySlots: regularSlots,
    nextDaySlots: earlyMorningSlots,
  };
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';
    
    const body = await request.json();
    const { 
      sport,
      date,
      timeSlot,
      timeSlots,
      nextDayDate: requestedNextDayDate,
      nextDayTimeSlots,
      court,
      customerInfo,
      totalPrice: requestedPrice,
      extras,
      paymentReference
    } = body;

    // Validate court selection for Shuttle Badminton
    if (sport === "Shuttle Badminton" && !court) {
      return NextResponse.json(
        { success: false, message: 'Court selection is required for Shuttle Badminton' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!sport || !date || (!timeSlot && (!Array.isArray(timeSlots) || timeSlots.length === 0)) || !customerInfo?.name || !customerInfo?.phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    const parsedSlots = parseTimeSlots(timeSlot, timeSlots);
    const parsedNextDaySlots = parseTimeSlots(undefined, nextDayTimeSlots);
    const hasExplicitNextDayPayload = Boolean(requestedNextDayDate) && parsedNextDaySlots.length > 0;
    if (parsedSlots.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid time slots selected' },
        { status: 400 }
      );
    }

    // Price is always calculated on the server from the owner's settings;
    // only an admin may override it (e.g. a negotiated rate).
    const settings = await getSiteSettings();
    const courtPrice = getCourt(settings, sport);
    if (!courtPrice || !courtPrice.active) {
      return NextResponse.json(
        { success: false, message: 'This sport is not available for booking' },
        { status: 400 }
      );
    }
    const price = calculateBookingPrice(settings, {
      sport,
      date: String(date).slice(0, 10),
      slots: [...parsedSlots, ...(hasExplicitNextDayPayload ? parsedNextDaySlots : [])],
      extras,
    });
    const adminPrice = Number(requestedPrice);
    const totalPrice = isAdmin && Number.isFinite(adminPrice) && adminPrice >= 0 ? adminPrice : price!.total;

    const bookingDate = getISTDayStart(date);
    const todayStart = getISTTodayStart();

    // Only admins can create bookings for past dates
    if (!isAdmin && bookingDate < todayStart) {
      return NextResponse.json(
        { success: false, message: 'Past-date booking is allowed only for admins' },
        { status: 403 }
      );
    }

    const { spansMidnight, sameDaySlots, nextDaySlots } = splitCrossMidnightSlots(parsedSlots);

    if (hasExplicitNextDayPayload) {
      const explicitPrimaryDate = getISTDayStart(date);
      const explicitSecondaryDate = getISTDayStart(requestedNextDayDate as string);

      const sameDayConflicts = await findBlockingConflicts(sport, explicitPrimaryDate, parsedSlots, court);
      if (sameDayConflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Selected slot is already blocked by a confirmed booking',
          },
          { status: 409 }
        );
      }

      const explicitNextDayConflicts = await findBlockingConflicts(sport, explicitSecondaryDate, parsedNextDaySlots, court);
      if (explicitNextDayConflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Next-day slot is already blocked by a confirmed booking',
          },
          { status: 409 }
        );
      }

      const bookingReference = `BK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const finalBookingStatus = isAdmin ? 'confirmed' : 'pending';

      const bookingData = {
        bookingReference,
        sport,
        date: explicitPrimaryDate,
        timeSlots: parsedSlots,
        nextDayDate: explicitSecondaryDate,
        nextDayTimeSlots: parsedNextDaySlots,
        court: court || undefined,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        totalAmount: totalPrice,
        paymentStatus: 'pending',
        paymentReference: paymentReference || '',
        bookingStatus: finalBookingStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booking = await (Booking.create as any)(bookingData);

      return NextResponse.json({
        success: true,
        message: isAdmin
          ? '✅ Admin booking confirmed and blocked immediately.'
          : '✅ Booking created as pending. Slot will be blocked after admin approval.',
        booking: {
          id: booking._id,
          bookingReference: booking.bookingReference,
          sport: booking.sport,
          date: booking.date,
          nextDayDate: booking.nextDayDate,
          timeSlots: booking.timeSlots,
          nextDayTimeSlots: booking.nextDayTimeSlots,
          totalAmount: booking.totalAmount,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus
        }
      });
    }

    const sameDayConflicts = await findBlockingConflicts(sport, bookingDate, sameDaySlots, court);
    if (sameDayConflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Selected slot is already blocked by a confirmed booking',
        },
        { status: 409 }
      );
    }

    let derivedNextDayDate: Date | undefined;
    if (spansMidnight && nextDaySlots.length > 0) {
      derivedNextDayDate = addDaysFromISTDayStart(bookingDate, 1);

      const nextDayConflicts = await findBlockingConflicts(sport, derivedNextDayDate, nextDaySlots, court);
      if (nextDayConflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Next-day slot is already blocked by a confirmed booking',
          },
          { status: 409 }
        );
      }
    }

    // Generate booking reference
    const bookingReference = `BK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const finalBookingStatus = isAdmin ? 'confirmed' : 'pending';

    const primaryDate = spansMidnight && derivedNextDayDate ? derivedNextDayDate : bookingDate;
    const primarySlots = spansMidnight ? nextDaySlots : sameDaySlots;
    const secondaryDate = spansMidnight ? bookingDate : undefined;
    const secondarySlots = spansMidnight ? sameDaySlots : undefined;

    // Blocking is based only on bookingStatus.
    const bookingData = {
      bookingReference,
      sport,
      date: primaryDate,
      timeSlots: primarySlots,
      nextDayDate: secondaryDate,
      nextDayTimeSlots: secondarySlots,
      court: court || undefined, // Include court for Shuttle Badminton
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      totalAmount: totalPrice,
      paymentStatus: 'pending', // Payment can be collected later after customer plays
      paymentReference: paymentReference || '',
      bookingStatus: finalBookingStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booking = await (Booking.create as any)(bookingData);


    return NextResponse.json({
      success: true,
      message: isAdmin
        ? '✅ Admin booking confirmed and blocked immediately.'
        : '✅ Booking created as pending. Slot will be blocked after admin approval.',
      booking: {
        id: booking._id,
        bookingReference: booking.bookingReference,
        sport: booking.sport,
        date: booking.date,
        nextDayDate: booking.nextDayDate,
        timeSlots: booking.timeSlots, // Use timeSlots (plural) from the model
        nextDayTimeSlots: booking.nextDayTimeSlots,
        totalAmount: booking.totalAmount,
        bookingStatus: booking.bookingStatus, // Use bookingStatus from the model
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create booking',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authConfig';
import { addDaysFromISTDayStart, getISTDayStart, getISTTodayStart } from '@/app/lib/istDate';
import { findBlockingConflicts } from '@/app/lib/bookingConflicts';
import { getSiteSettings } from '@/app/lib/settings.server';
import { bookingPeople, bookingRuleError, calculateBookingPrice, getCourt } from '@/app/lib/pricing';
import { rememberCustomer } from '@/app/lib/customers.server';

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

const BADMINTON_COURTS = ['S1', 'S2', 'S3'];
const newReference = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

interface GroupLine {
  court: string;
  slots: string[]; // picked on the selected day's grid
  nextSlots: string[]; // picked on the next-day overlap grid (00:00–05:00 of the following day)
}

/**
 * Several badminton courts in one checkout (S1 6–7, S2 7–8 …): one Booking per court sharing a
 * `groupRef`, priced per court on the server, every court conflict-checked before anything is
 * saved, paid and confirmed together (lib/payments.server.ts follows the group).
 */
async function createGroupBooking(opts: {
  sport: string;
  date: string;
  rawLines: any[];
  customerInfo: any;
  isAdmin: boolean;
  requestedPrice: unknown;
  paymentReference?: string;
}) {
  const { sport, date, customerInfo, isAdmin } = opts;
  if (sport !== 'Shuttle Badminton') {
    return NextResponse.json({ success: false, message: 'Only badminton courts can be booked together' }, { status: 400 });
  }
  if (!date || !customerInfo?.name || !customerInfo?.phone) {
    return NextResponse.json({ success: false, message: 'Missing required booking information' }, { status: 400 });
  }

  const lines: GroupLine[] = [];
  for (const raw of opts.rawLines) {
    const court = String(raw?.court || '');
    if (!BADMINTON_COURTS.includes(court)) {
      return NextResponse.json({ success: false, message: 'Choose a court (S1, S2 or S3) for each line' }, { status: 400 });
    }
    if (lines.some((l) => l.court === court)) {
      return NextResponse.json({ success: false, message: `Court ${court} is listed twice` }, { status: 400 });
    }
    const slots = parseTimeSlots(undefined, raw?.timeSlots);
    const nextSlots = parseTimeSlots(undefined, raw?.nextDayTimeSlots);
    if (slots.length + nextSlots.length > 0) lines.push({ court, slots, nextSlots });
  }
  if (lines.length === 0) {
    return NextResponse.json({ success: false, message: 'No valid time slots selected' }, { status: 400 });
  }

  const settings = await getSiteSettings();
  const courtPrice = getCourt(settings, sport);
  if (!courtPrice || !courtPrice.active) {
    return NextResponse.json({ success: false, message: 'This sport is not available for booking' }, { status: 400 });
  }

  const bookingDate = getISTDayStart(date);
  const nextDate = addDaysFromISTDayStart(bookingDate, 1);
  if (!isAdmin && bookingDate < getISTTodayStart()) {
    return NextResponse.json({ success: false, message: 'Past-date booking is allowed only for admins' }, { status: 403 });
  }

  // Price each court from the owner's settings; customers must follow the booking rules
  const prices: number[] = [];
  for (const line of lines) {
    const priceInput = { sport, date: String(date).slice(0, 10), slots: [...line.slots, ...line.nextSlots] };
    const ruleError = isAdmin ? null : bookingRuleError(settings, priceInput);
    if (ruleError) return NextResponse.json({ success: false, message: `Court ${line.court}: ${ruleError}` }, { status: 400 });
    prices.push(calculateBookingPrice(settings, priceInput)!.total);
  }
  // An admin may override the group total (negotiated rate); it is spread across the courts
  const computedTotal = prices.reduce((a, b) => a + b, 0);
  const adminTotal = Number(opts.requestedPrice);
  if (isAdmin && Number.isFinite(adminTotal) && adminTotal >= 0 && adminTotal !== computedTotal) {
    let allocated = 0;
    prices.forEach((p, i) => {
      const share = i === prices.length - 1 ? adminTotal - allocated : Math.round((computedTotal ? p / computedTotal : 1 / prices.length) * adminTotal);
      prices[i] = share;
      allocated += share;
    });
  }

  // Work out each court's dates the same way a single booking does, then check every court
  // before saving anything, so a clash on one court leaves nothing half booked
  const docs: any[] = [];
  for (const [i, line] of lines.entries()) {
    let primaryDate = bookingDate;
    let primarySlots = line.slots;
    let secondaryDate: Date | undefined;
    let secondarySlots: string[] | undefined;
    if (line.nextSlots.length > 0 && line.slots.length > 0) {
      secondaryDate = nextDate;
      secondarySlots = line.nextSlots;
    } else if (line.nextSlots.length > 0) {
      primaryDate = nextDate;
      primarySlots = line.nextSlots;
    } else {
      const split = splitCrossMidnightSlots(line.slots);
      if (split.spansMidnight) {
        primaryDate = nextDate;
        primarySlots = split.nextDaySlots;
        secondaryDate = bookingDate;
        secondarySlots = split.sameDaySlots;
      }
    }

    const conflicts = [
      ...(await findBlockingConflicts(sport, primaryDate, primarySlots, line.court)),
      ...(secondaryDate && secondarySlots ? await findBlockingConflicts(sport, secondaryDate, secondarySlots, line.court) : []),
    ];
    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, message: `Court ${line.court}: a selected slot is already blocked by a confirmed booking` },
        { status: 409 }
      );
    }

    docs.push({
      sport,
      date: primaryDate,
      timeSlots: primarySlots,
      nextDayDate: secondaryDate,
      nextDayTimeSlots: secondarySlots,
      court: line.court,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      totalAmount: prices[i],
      paymentStatus: 'pending',
      paymentReference: opts.paymentReference || '',
      bookingStatus: isAdmin ? 'confirmed' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const groupRef = newReference('BG');
  const created: any[] = [];
  for (const doc of docs) {
    created.push(await (Booking.create as any)({ ...doc, bookingReference: newReference('BK'), groupRef }));
  }
  await rememberCustomer(customerInfo);

  const bookings = created.map((b) => ({
    id: b._id,
    bookingReference: b.bookingReference,
    sport: b.sport,
    court: b.court,
    date: b.date,
    nextDayDate: b.nextDayDate,
    timeSlots: b.timeSlots,
    nextDayTimeSlots: b.nextDayTimeSlots,
    totalAmount: b.totalAmount,
    bookingStatus: b.bookingStatus,
    paymentStatus: b.paymentStatus,
  }));
  return NextResponse.json({
    success: true,
    message: isAdmin
      ? `✅ ${bookings.length} court${bookings.length > 1 ? 's' : ''} confirmed and blocked immediately.`
      : '✅ Booking created as pending. Courts will be blocked after admin approval.',
    group: {
      ref: groupRef,
      totalAmount: prices.reduce((a, b) => a + b, 0),
      // one UPI payment covers the whole group; the server adds up the courts
      paymentBookingId: created[0]._id,
    },
    bookings,
    booking: bookings[0],
  });
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoose();
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    const body = await request.json();
    if (Array.isArray(body.lines)) {
      return await createGroupBooking({
        sport: body.sport,
        date: body.date,
        rawLines: body.lines,
        customerInfo: body.customerInfo,
        isAdmin,
        requestedPrice: body.totalPrice,
        paymentReference: body.paymentReference,
      });
    }
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
      people,
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
    const priceInput = {
      sport,
      date: String(date).slice(0, 10),
      slots: [...parsedSlots, ...(hasExplicitNextDayPayload ? parsedNextDaySlots : [])],
      extras,
      people: courtPrice.perPerson ? Number(people) : undefined,
    };
    // Customers must follow the booking rules (weekday turf blocks, minimum players); admins may override
    const ruleError = isAdmin ? null : bookingRuleError(settings, priceInput);
    if (ruleError) {
      return NextResponse.json({ success: false, message: ruleError }, { status: 400 });
    }
    const price = calculateBookingPrice(settings, priceInput);
    const players = courtPrice.perPerson ? bookingPeople(courtPrice, people) : undefined;
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
        players,
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
    // keep the customer book current so the desk can prefill them next time
    await rememberCustomer(customerInfo);

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
      players,
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
    // keep the customer book current so the desk can prefill them next time
    await rememberCustomer(customerInfo);


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

import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/app/server/mongodb';
import Booking from '@/app/models/Booking';
import whatsAppCloudService from '@/app/services/WhatsAppCloudService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authConfig';
import { addDaysFromISTDayStart, getISTDayRange, getISTDayStart, getISTTodayStart } from '@/app/lib/istDate';

const CROSS_TURF_SPORTS = ['Cricket', 'Football', 'Functions and Events'];

function parseTimeSlots(timeSlot?: string, timeSlots?: string[]): string[] {
  if (Array.isArray(timeSlots) && timeSlots.length > 0) {
    return [...new Set(timeSlots.map((slot) => slot.trim()).filter(Boolean))];
  }

  if (!timeSlot) return [];
  return [...new Set(timeSlot.split(',').map((slot) => slot.trim()).filter(Boolean))];
}

function expandStoredSlots(timeSlots: string[] = []): string[] {
  return [...new Set(
    timeSlots
      .flatMap((slot) => String(slot || '').split(','))
      .map((slot) => slot.trim())
      .filter(Boolean)
  )];
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

async function findBlockingConflicts(
  sport: string,
  date: Date,
  slots: string[],
  court?: string
) {
  if (slots.length === 0) return [];

  const { dayStart, dayEnd } = getISTDayRange(date);

  const sportFilter = CROSS_TURF_SPORTS.includes(sport)
    ? { $in: CROSS_TURF_SPORTS }
    : sport;

  const query: any = {
    bookingStatus: 'confirmed',
    sport: sportFilter,
    $or: [
      { date: { $gte: dayStart, $lte: dayEnd } },
      { nextDayDate: { $gte: dayStart, $lte: dayEnd } },
    ],
  };

  if (sport === 'Shuttle Badminton' && court) {
    query.court = court;
  }

  const bookings = await (Booking.find as any)(query).select('date nextDayDate timeSlots nextDayTimeSlots');

  return bookings.filter((booking: any) => {
    const sameDaySlots = booking.date && booking.date >= dayStart && booking.date <= dayEnd
      ? expandStoredSlots(booking.timeSlots || [])
      : [];
    const nextDaySlots = booking.nextDayDate && booking.nextDayDate >= dayStart && booking.nextDayDate <= dayEnd
      ? expandStoredSlots(booking.nextDayTimeSlots || [])
      : [];

    const blockedSlots = new Set([...sameDaySlots, ...nextDaySlots]);
    return slots.some((slot) => blockedSlots.has(slot));
  });
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
      totalPrice,
      transactionId,
      paymentMethod,
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
    if (!sport || !date || (!timeSlot && (!Array.isArray(timeSlots) || timeSlots.length === 0)) || !customerInfo || !totalPrice) {
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
        paymentMethod: paymentMethod || 'manual',
        transactionId: transactionId || '',
        paymentReference: paymentReference || '',
        bookingStatus: finalBookingStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const booking = await (Booking.create as any)(bookingData);
      await sendWhatsAppNotifications(booking);

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
        },
        nextSteps: [
          '✅ Your booking is confirmed - you can play the slot',
          '💰 Payment due before or after playing (flexible)',
          '📱 We\'ll send you payment reminder via WhatsApp',
          '🎫 Keep your booking reference safe'
        ]
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
      paymentMethod: paymentMethod || 'manual',
      transactionId: transactionId || '',
      paymentReference: paymentReference || '',
      bookingStatus: finalBookingStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booking = await (Booking.create as any)(bookingData);

    // Send WhatsApp notifications
    await sendWhatsAppNotifications(booking);

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
      },
      nextSteps: [
        '✅ Your booking is confirmed - you can play the slot',
        '💰 Payment due before or after playing (flexible)',
        '📱 We\'ll send you payment reminder via WhatsApp',
        '🎫 Keep your booking reference safe'
      ]
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

async function sendWhatsAppNotifications(booking: any) {
  try {
    // Format date and time for display
    const bookingDateObj = new Date(booking.date);
    const formattedDate = bookingDateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    const formattedWeekday = bookingDateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      timeZone: 'Asia/Kolkata',
    });
    const bookingDate = `${formattedDate} (${formattedWeekday})`;

    const timeSlot = Array.isArray(booking.timeSlots) ? booking.timeSlots.join(', ') : booking.timeSlots || 'N/A';
    const courtName = booking.sport === 'Shuttle Badminton'
      ? `${booking.sport} (${booking.court || 'Court'})`
      : `${booking.sport} (Full Ground)`;

    const finalAmount = Number(booking.totalAmount || 0);
    const paidAmount = booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid'
      ? finalAmount
      : 0;
    const pendingAmount = Math.max(finalAmount - paidAmount, 0);

    // Send customer booking confirmation
    const customerSuccess = await whatsAppCloudService.sendBookingConfirmation(
      booking.customerPhone,
      {
        bookingReference: booking.bookingReference,
        courtName,
        date: bookingDate,
        time: timeSlot,
        amount: booking.totalAmount,
        customerName: booking.customerName,
        venue: 'Sathiyan Multisport Sport Club',
        slotAmount: finalAmount,
        discountAmount: 0,
        finalAmount,
        paidAmount,
        pendingAmount,
      }
    );

    // Send admin notification
    const adminSuccess = await whatsAppCloudService.sendAdminNotification({
      bookingReference: booking.bookingReference,
      courtName,
      date: bookingDate,
      time: timeSlot,
      amount: booking.totalAmount,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone
    });

    console.log(`📱 WhatsApp notifications - Customer: ${customerSuccess ? '✅' : '❌'}, Admin: ${adminSuccess ? '✅' : '❌'}`);

  } catch (error) {
    console.warn('Failed to send WhatsApp notifications:', error);
    
    // Fallback to console logging for development/testing
    console.log('📱 BOOKING NOTIFICATION (Fallback)');
    console.log(`Customer: ${booking.customerName} (${booking.customerPhone})`);
    console.log(`Booking: ${booking.bookingReference}`);
    console.log(`Sport: ${booking.sport} | Amount: ₹${booking.totalAmount}`);
    console.log(`Date: ${booking.date} | Time: ${booking.timeSlots}`);
  }
}

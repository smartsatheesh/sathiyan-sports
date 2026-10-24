import Booking from '@/app/models/Booking';
import { getISTDayRange } from '@/app/lib/istDate';

// Cricket, Football and Events share the same turf, so they block each other.
const CROSS_TURF_SPORTS = ['Cricket', 'Football', 'Functions and Events'];

export function expandStoredSlots(timeSlots: string[] = []): string[] {
  return [...new Set(
    timeSlots
      .flatMap((slot) => String(slot || '').split(','))
      .map((slot) => slot.trim())
      .filter(Boolean)
  )];
}

/** Confirmed bookings that already occupy any of the given slots on that IST day. */
export async function findBlockingConflicts(
  sport: string,
  date: Date,
  slots: string[],
  court?: string,
  excludeBookingId?: string
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

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
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

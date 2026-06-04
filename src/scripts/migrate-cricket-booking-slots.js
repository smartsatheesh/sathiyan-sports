const mongoose = require('mongoose');

function to24Hour(hour, minute, period) {
  let h = Number(hour);
  const m = Number(minute);

  if (period) {
    const upper = period.toUpperCase();
    if (upper === 'AM' && h === 12) h = 0;
    if (upper === 'PM' && h !== 12) h += 12;
  }

  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeSlotRange(slot) {
  if (typeof slot !== 'string') return null;

  const trimmed = slot.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i);
  if (!match) return null;

  const startPeriod = match[3] || '';
  const endPeriod = match[6] || '';

  // If only one side carries AM/PM, use it for both ends.
  const resolvedStartPeriod = startPeriod || endPeriod;
  const resolvedEndPeriod = endPeriod || startPeriod;

  const start = to24Hour(match[1], match[2], resolvedStartPeriod);
  const end = to24Hour(match[4], match[5], resolvedEndPeriod);

  if (!start || !end) return null;

  return `${start} - ${end}`;
}

function normalizeSlotsFromBooking(booking) {
  const rawSlots = [];

  if (Array.isArray(booking.timeSlots)) {
    for (const item of booking.timeSlots) {
      if (typeof item === 'string') {
        const parts = item.split(',').map(s => s.trim()).filter(Boolean);
        rawSlots.push(...parts);
      }
    }
  }

  if (typeof booking.timeSlot === 'string' && booking.timeSlot.trim()) {
    const legacyParts = booking.timeSlot.split(',').map(s => s.trim()).filter(Boolean);
    rawSlots.push(...legacyParts);
  }

  const normalized = [];
  const rejected = [];

  for (const raw of rawSlots) {
    const normalizedValue = normalizeSlotRange(raw);
    if (normalizedValue) {
      normalized.push(normalizedValue);
    } else {
      rejected.push(raw);
    }
  }

  const uniqueNormalized = Array.from(new Set(normalized));
  return {
    normalized: uniqueNormalized,
    rejected,
    rawSlots,
  };
}

async function migrateCricketBookingSlots({ apply = false } = {}) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Load env before running this script.');
  }

  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const bookingsCollection = db.collection('bookings');

  const cricketBookings = await bookingsCollection
    .find({ sport: 'Cricket' }, { projection: { _id: 1, bookingReference: 1, timeSlots: 1, timeSlot: 1 } })
    .toArray();

  let scanned = 0;
  let needsUpdate = 0;
  let updated = 0;
  let unchanged = 0;
  let withRejected = 0;

  const samples = [];

  for (const booking of cricketBookings) {
    scanned += 1;

    const { normalized, rejected, rawSlots } = normalizeSlotsFromBooking(booking);
    const currentArray = Array.isArray(booking.timeSlots) ? booking.timeSlots : [];
    const normalizedCurrent = currentArray.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);

    const shouldUpdate =
      normalized.length > 0 &&
      (normalizedCurrent.length !== normalized.length || normalizedCurrent.some((slot, idx) => slot !== normalized[idx]));

    if (rejected.length > 0) {
      withRejected += 1;
    }

    if (!shouldUpdate) {
      unchanged += 1;
      continue;
    }

    needsUpdate += 1;

    if (samples.length < 10) {
      samples.push({
        id: String(booking._id),
        reference: booking.bookingReference || '-',
        before: rawSlots,
        after: normalized,
        rejected,
      });
    }

    if (apply) {
      await bookingsCollection.updateOne(
        { _id: booking._id },
        {
          $set: {
            timeSlots: normalized,
            updatedAt: new Date(),
          },
          $unset: {
            timeSlot: '',
          },
        }
      );
      updated += 1;
    }
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    scanned,
    needsUpdate,
    updated,
    unchanged,
    withRejected,
    samples,
  };

  return summary;
}

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
  };
}

async function run() {
  const { apply } = parseArgs(process.argv.slice(2));
  console.log(`[migration] cricket booking slot normalization - mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  try {
    const summary = await migrateCricketBookingSlots({ apply });
    console.log('[migration] summary:', JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('[migration] failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  migrateCricketBookingSlots,
  normalizeSlotRange,
};

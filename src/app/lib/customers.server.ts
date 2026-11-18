// Booking customers: remembered automatically from bookings, looked up by mobile at the desk,
// ranked for offers and for the home page's "booking champs of the week".
import { createHash } from 'crypto';
import Booking from '../models/Booking';
import Customer from '../models/Customer';
import { connectToMongoose } from '../server/mongodb';
import { getISTTodayStart } from './istDate';

const DAY = 864e5;

/** Digits only, last 10 (drops +91 / 0 prefixes and spaces). */
export const normalizeMobile = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/** "98765 43210" → "987 XXXX 210": enough for a player to recognise themselves, not to be called. */
export const maskMobile = (mobile: string) => (mobile.length === 10 ? `${mobile.slice(0, 3)} XXXX ${mobile.slice(-3)}` : 'XXXX');

export interface CustomerStats {
  mobile: string;
  name: string; // from the most recent booking
  email: string;
  bookings: number; // non-cancelled bookings, all time
  cancelled: number;
  last30: number; // play dates in the last 30 days
  thisWeek: number; // play dates in the last 7 days (incl. today)
  weekHours: number;
  spent: number; // booked value of non-cancelled bookings
  firstAt: Date | null;
  lastAt: Date | null; // latest play date
  favouriteSport: string;
}

interface BookingLite {
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  sport?: string;
  date?: Date;
  bookingStatus?: string;
  totalAmount?: number;
  timeSlots?: string[];
  nextDayTimeSlots?: string[];
  createdAt?: Date;
}

/**
 * Per-customer booking figures, aggregated in memory from the bookings collection (phones are
 * stored as typed, so they are normalised here rather than in a pipeline).
 */
export async function bookingStats(): Promise<Map<string, CustomerStats>> {
  await connectToMongoose();
  const rows: BookingLite[] = await (Booking.find as any)({ customerPhone: { $exists: true, $ne: '' } })
    .select('customerPhone customerName customerEmail sport date bookingStatus totalAmount timeSlots nextDayTimeSlots createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const today = getISTTodayStart();
  const weekStart = new Date(today.getTime() - 6 * DAY);
  const monthStart = new Date(today.getTime() - 29 * DAY);
  const tomorrow = new Date(today.getTime() + DAY);

  const stats = new Map<string, CustomerStats & { sports: Record<string, number> }>();
  for (const b of rows) {
    const mobile = normalizeMobile(b.customerPhone);
    if (mobile.length !== 10) continue;
    let s = stats.get(mobile);
    if (!s) {
      s = { mobile, name: '', email: '', bookings: 0, cancelled: 0, last30: 0, thisWeek: 0, weekHours: 0, spent: 0, firstAt: null, lastAt: null, favouriteSport: '', sports: {} };
      stats.set(mobile, s);
    }
    // rows arrive oldest first, so the last booking's details win
    if (b.customerName) s.name = String(b.customerName).trim();
    if (b.customerEmail) s.email = String(b.customerEmail).trim();
    if (b.bookingStatus === 'cancelled') {
      s.cancelled++;
      continue;
    }
    s.bookings++;
    s.spent += Number(b.totalAmount) || 0;
    if (b.sport) s.sports[b.sport] = (s.sports[b.sport] || 0) + 1;
    const playDate = b.date ? new Date(b.date) : b.createdAt ? new Date(b.createdAt) : null;
    if (playDate) {
      if (!s.firstAt || playDate < s.firstAt) s.firstAt = playDate;
      if (!s.lastAt || playDate > s.lastAt) s.lastAt = playDate;
      if (playDate < tomorrow) {
        if (playDate >= monthStart) s.last30++;
        if (playDate >= weekStart) {
          s.thisWeek++;
          s.weekHours += ((b.timeSlots?.length || 0) + (b.nextDayTimeSlots?.length || 0)) / 2;
        }
      }
    }
  }

  const result = new Map<string, CustomerStats>();
  stats.forEach((s, mobile) => {
    const { sports, ...rest } = s;
    rest.favouriteSport = Object.entries(sports).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    result.set(mobile, rest);
  });
  return result;
}

/**
 * Make sure every booking customer has a Customer record and that the denormalised counts are
 * current. Cheap for a club-sized bookings collection; called from the admin list and after a
 * new booking.
 */
export async function syncCustomers(onlyMobile?: string) {
  const stats = await bookingStats();
  const ops: any[] = [];
  stats.forEach((s, mobile) => {
    if (onlyMobile && mobile !== onlyMobile) return;
    ops.push({
      updateOne: {
        filter: { mobile },
        update: {
          $setOnInsert: { mobile, name: s.name, email: s.email, showOnLeaderboard: true, notes: '' },
          $set: { bookingCount: s.bookings, firstBookingAt: s.firstAt, lastBookingAt: s.lastAt, favouriteSport: s.favouriteSport },
        },
        upsert: true,
      },
    });
  });
  if (ops.length) await (Customer.bulkWrite as any)(ops, { ordered: false });
  return stats;
}

/**
 * Called right after a booking is created: keeps the customer's name/email current (a blank
 * name never overwrites a known one) and refreshes their counts. Never throws — a booking must
 * not fail because of the customer book.
 */
export async function rememberCustomer(info: { name?: string; phone?: string; email?: string }) {
  try {
    const mobile = normalizeMobile(info.phone);
    if (mobile.length !== 10) return;
    await connectToMongoose();
    const set: Record<string, string> = {};
    if (info.name && String(info.name).trim()) set.name = String(info.name).trim();
    if (info.email && String(info.email).trim()) set.email = String(info.email).trim();
    await (Customer.updateOne as any)(
      { mobile },
      { $setOnInsert: { mobile, showOnLeaderboard: true, notes: '' }, ...(Object.keys(set).length ? { $set: set } : {}) },
      { upsert: true }
    );
    await syncCustomers(mobile);
    champsCache = null;
  } catch (error) {
    console.error('rememberCustomer failed:', error);
  }
}

/** What the desk gets when it types a returning customer's mobile. */
export async function lookupCustomer(mobileInput: string) {
  const mobile = normalizeMobile(mobileInput);
  if (mobile.length !== 10) return null;
  await connectToMongoose();
  let doc = await (Customer.findOne as any)({ mobile }).lean();
  if (!doc) {
    // older bookings made before the customer book existed
    const stats = await syncCustomers(mobile);
    if (!stats.has(mobile)) return null;
    doc = await (Customer.findOne as any)({ mobile }).lean();
  }
  if (!doc) return null;
  return {
    name: doc.name || '',
    email: doc.email || '',
    bookingCount: doc.bookingCount || 0,
    lastBookingAt: doc.lastBookingAt || null,
    favouriteSport: doc.favouriteSport || '',
  };
}

export interface Champ {
  id: string;
  name: string;
  mobile: string; // masked
  bookings: number; // last 7 days
  hours: number;
  sport: string;
  photoUrl: string | null;
}

let champsCache: { at: number; champs: Champ[] } | null = null;
const CHAMPS_TTL = 5 * 60 * 1000;

/** The week's most active booking customers (last 7 days incl. today), for the home page. */
export async function weeklyChamps(limit = 5): Promise<Champ[]> {
  if (champsCache && Date.now() - champsCache.at < CHAMPS_TTL) return champsCache.champs.slice(0, limit);
  const stats = await bookingStats();
  const ranked = Array.from(stats.values())
    .filter((s) => s.thisWeek > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek || b.weekHours - a.weekHours || b.bookings - a.bookings);
  const docs = ranked.length
    ? await (Customer.find as any)({ mobile: { $in: ranked.slice(0, limit * 3).map((s) => s.mobile) } })
        .select('mobile name showOnLeaderboard updatedAt photo')
        .lean()
    : [];
  const byMobile = new Map<string, any>(docs.map((d: any) => [d.mobile, d]));
  const champs: Champ[] = [];
  for (const s of ranked) {
    const doc = byMobile.get(s.mobile);
    if (doc && doc.showOnLeaderboard === false) continue;
    const name = (doc?.name || s.name || '').trim();
    if (!name) continue;
    champs.push({
      // never the mobile itself: the response is public
      id: doc ? String(doc._id) : createHash('sha256').update(s.mobile).digest('hex').slice(0, 12),
      name,
      mobile: maskMobile(s.mobile),
      bookings: s.thisWeek,
      hours: Math.round(s.weekHours * 2) / 2,
      sport: s.favouriteSport,
      photoUrl: doc?.photo ? `/api/customers/${doc._id}/photo?v=${new Date(doc.updatedAt || 0).getTime()}` : null,
    });
    if (champs.length >= limit) break;
  }
  champsCache = { at: Date.now(), champs };
  return champs;
}

export const invalidateChamps = () => {
  champsCache = null;
};

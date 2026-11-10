// Single source of truth for prices. Values are edited by the owner in /admin/settings and
// stored in the Settings collection; DEFAULT_SETTINGS is the fallback and the seed.
// This module is shared by client and server, so keep it free of server-only imports.

export const SUBSCRIPTION_TYPES = ["monthly", "quarterly", "half yearly", "yearly"] as const;
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];

export const SUBSCRIPTION_MONTHS: Record<SubscriptionType, number> = {
  monthly: 1,
  quarterly: 3,
  "half yearly": 6,
  yearly: 12,
};

export type PlanPrices = Record<SubscriptionType, number>;

export interface CourtPrice {
  sport: string;
  weekday: number; // price per hour (a 30-minute slot costs half); per person per hour when perPerson
  weekend: number; // weekend & holiday price per hour
  perHour: boolean; // true = booked as named sessions by the hour (Functions and Events); false = 30-minute slots
  active: boolean;
  /** Weekdays are sold in blocks of this many hours (e.g. 2 = "1 hour + 1 hour free"). */
  weekdayBlockHours?: number;
  /** Priced per person per hour (cricket nets). */
  perPerson?: boolean;
  minPeople?: number;
  maxPeople?: number;
  /** Short note shown with the price, e.g. "per court, up to 4 players" */
  note?: string;
}

/** A monthly coaching programme (separate from court booking prices). */
export interface CoachingProgram {
  key: string; // stable id stored on the member, e.g. "badminton"
  name: string; // e.g. "Badminton coaching"
  monthly: number; // kids, per person per month
  adultMonthly?: number; // adults & veterans per month (defaults to `monthly`)
  sport?: string; // members with this preferred sport default to this programme
}

/** Monthly coaching fee for a member of this age group. */
export function programMonthlyFee(program: CoachingProgram, champType?: string): number {
  return champType === "kids" ? program.monthly : program.adultMonthly ?? program.monthly;
}

export interface Holiday {
  date: string; // yyyy-MM-dd
  name: string;
}

/** Slot length for court sports; prices are per hour. */
export const SLOT_HOURS = 0.5;
/**
 * v1: court prices per 30-minute slot. v2: per hour.
 * v3: owner's 2026-11 price list (turf blocks, nets, ₹300 badminton, holidays).
 * v4: coaching priced per programme (badminton/football/cricket/fitness) instead of one tuition fee.
 * v5: separate adult/veteran price per programme (₹1,200 for sport coaching).
 * v6: Karate and Silambam join the ₹600 fitness programme.
 * v7: Academic tuition joins it too.
 */
export const PRICING_VERSION = 7;

const FITNESS_NAME = "Yoga / Taekwondo / Fitness / Karate / Silambam / Academic Tuition";
// Earlier default names of that programme, renamed on load unless the owner customised it
const OLD_FITNESS_NAMES = ["Yoga / Taekwondo / Fitness", "Yoga / Taekwondo / Fitness / Karate / Silambam"];

export interface Extra {
  key: string; // stable id, e.g. "ball"
  name: string;
  price: number;
}

export interface SiteSettings {
  pricingVersion?: number;
  courts: CourtPrice[];
  extras: Extra[];
  weekendDays: number[]; // 0 = Sunday … 6 = Saturday
  holidays: Holiday[]; // charged at the weekend price
  membership: {
    programs: CoachingProgram[]; // coaching fees per programme, per person per month
    flexibleSurchargePerMonth: number;
  };
  tournamentDefaultFee: number;
  expenses: { people: string[]; categories: string[] };
  upi: { vpa: string; payeeName: string };
  whatsappNumber: string; // 10-digit or with 91 prefix
}

// Fixed-date Tamil Nadu holidays. Festivals that follow the lunar calendar (Ramzan, Bakrid,
// Vinayakar Chathurthi, Ayudha Pooja, Deepavali, Good Friday…) are added by the owner each year.
const TN_FIXED_HOLIDAYS: Holiday[] = [
  { date: "2026-12-25", name: "Christmas" },
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-15", name: "Pongal" },
  { date: "2027-01-16", name: "Thiruvalluvar Day" },
  { date: "2027-01-17", name: "Uzhavar Thirunal" },
  { date: "2027-01-26", name: "Republic Day" },
  { date: "2027-04-14", name: "Tamil New Year" },
  { date: "2027-05-01", name: "May Day" },
  { date: "2027-08-15", name: "Independence Day" },
  { date: "2027-10-02", name: "Gandhi Jayanthi" },
  { date: "2027-12-25", name: "Christmas" },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  pricingVersion: PRICING_VERSION,
  courts: [
    { sport: "Cricket", weekday: 500, weekend: 800, perHour: false, active: true, weekdayBlockHours: 2 },
    { sport: "Football", weekday: 500, weekend: 800, perHour: false, active: true, weekdayBlockHours: 2 },
    { sport: "Shuttle Badminton", weekday: 300, weekend: 300, perHour: false, active: true, note: "per court, up to 4 players" },
    { sport: "Cricket Nets", weekday: 50, weekend: 50, perHour: false, active: true, perPerson: true, minPeople: 2, maxPeople: 12 },
    { sport: "Functions and Events", weekday: 2000, weekend: 2500, perHour: true, active: true },
    { sport: "Body Zorb", weekday: 2000, weekend: 2000, perHour: false, active: true },
  ],
  extras: [{ key: "ball", name: "Ball", price: 80 }],
  weekendDays: [0, 5, 6],
  holidays: TN_FIXED_HOLIDAYS,
  membership: {
    programs: [
      { key: "badminton", name: "Badminton coaching", monthly: 2000, adultMonthly: 1200, sport: "Shuttle Badminton" },
      { key: "football", name: "Football coaching", monthly: 1500, adultMonthly: 1200, sport: "Football" },
      { key: "cricket", name: "Cricket coaching", monthly: 1500, adultMonthly: 1200, sport: "Cricket" },
      { key: "fitness", name: FITNESS_NAME, monthly: 600, adultMonthly: 600 },
    ],
    flexibleSurchargePerMonth: 0,
  },
  tournamentDefaultFee: 600,
  expenses: {
    people: ["Satheesh", "Sasi", "Maha", "Anu"],
    categories: ["Sathiyan sports", "Common", "Seimurai"],
  },
  upi: { vpa: "sathiyansportacademy202525-1@okaxis", payeeName: "Sathiyan Multi Sport Club" },
  whatsappNumber: "9787020525",
};

// Event sessions are booked as named blocks; price = hours × hourly rate
export const EVENT_SESSIONS = [
  { time: "Morning Session (06:00 - 12:00)", hours: 6 },
  { time: "Afternoon Session (12:00 - 18:00)", hours: 6 },
  { time: "Evening Session (18:00 - 24:00)", hours: 6 },
  { time: "Full Day (06:00 - 24:00)", hours: 18 },
  { time: "Custom Hours (Minimum 3 hours)", hours: 3 },
];

/** Merge stored (possibly partial/old) settings over defaults so new fields always exist. */
export function withDefaults(stored: Partial<SiteSettings> | null | undefined): SiteSettings {
  const s = (stored || {}) as Partial<SiteSettings> & { membership?: any };
  // Anything saved before the v3 court price list / v4 coaching prices is replaced by them
  const version = s.pricingVersion ?? 1;
  const current = version >= 3;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    pricingVersion: PRICING_VERSION,
    courts: current && s.courts?.length ? s.courts : DEFAULT_SETTINGS.courts,
    extras: s.extras ?? DEFAULT_SETTINGS.extras,
    weekendDays: s.weekendDays ?? DEFAULT_SETTINGS.weekendDays,
    holidays: current && Array.isArray(s.holidays) ? s.holidays : DEFAULT_SETTINGS.holidays,
    membership: version >= 4 && Array.isArray(s.membership?.programs) && s.membership.programs.length
      ? {
          ...DEFAULT_SETTINGS.membership,
          ...s.membership,
          programs: s.membership.programs.map((saved: CoachingProgram) => {
            // v4 had no adult price: take the default for known programmes
            const p = saved.adultMonthly !== undefined
              ? saved
              : { ...saved, adultMonthly: DEFAULT_SETTINGS.membership.programs.find((d) => d.key === saved.key)?.adultMonthly ?? saved.monthly };
            // older defaults didn't list Karate, Silambam or academic tuition (keep any custom name)
            return version < 7 && p.key === "fitness" && OLD_FITNESS_NAMES.includes(p.name) ? { ...p, name: FITNESS_NAME } : p;
          }),
        }
      : DEFAULT_SETTINGS.membership,
    expenses: {
      people: s.expenses?.people?.length ? s.expenses.people : DEFAULT_SETTINGS.expenses.people,
      categories: s.expenses?.categories?.length ? s.expenses.categories : DEFAULT_SETTINGS.expenses.categories,
    },
    upi: { ...DEFAULT_SETTINGS.upi, ...(s.upi || {}) },
  };
}

/** Weekday (0-6) of a yyyy-MM-dd date string, independent of server timezone. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

export function holidayOn(settings: SiteSettings, dateStr: string): Holiday | undefined {
  return settings.holidays.find((h) => h.date === dateStr.slice(0, 10));
}

/** Weekend pricing applies on weekend days and on listed public/local holidays. */
export function isWeekendDate(settings: SiteSettings, dateStr: string): boolean {
  return settings.weekendDays.includes(dayOfWeek(dateStr)) || Boolean(holidayOn(settings, dateStr));
}

export function getCourt(settings: SiteSettings, sport: string): CourtPrice | undefined {
  return settings.courts.find((c) => c.sport === sport);
}

export interface BookingPriceInput {
  sport: string;
  date: string; // yyyy-MM-dd of the first slot
  slots: string[]; // all selected slots (both days)
  extras?: Record<string, number>; // extra key -> quantity
  people?: number; // for per-person courts
}

function bookingHours(court: CourtPrice, slots: string[]) {
  return court.perHour
    ? slots.reduce((sum, slot) => sum + (EVENT_SESSIONS.find((s) => s.time === slot)?.hours || 1), 0)
    : slots.length * SLOT_HOURS;
}

/** People counted for per-person courts (clamped to the court's limits). */
export function bookingPeople(court: CourtPrice, people?: number) {
  if (!court.perPerson) return 1;
  const min = court.minPeople || 1;
  const max = court.maxPeople || 50;
  return Math.min(max, Math.max(min, Math.floor(Number(people) || min)));
}

/** A customer-facing reason the selection can't be booked as-is, or null. */
export function bookingRuleError(settings: SiteSettings, input: BookingPriceInput): string | null {
  const court = getCourt(settings, input.sport);
  if (!court) return "This sport is not available for booking";
  const weekend = isWeekendDate(settings, input.date);
  const block = court.weekdayBlockHours || 0;
  if (!weekend && block > 0) {
    const hours = bookingHours(court, input.slots);
    if (hours % block !== 0) {
      return `On weekdays ${input.sport.toLowerCase()} is booked in ${block}-hour blocks (pay 1 hour, get 1 hour free). Please choose ${block}, ${block * 2} or ${block * 3} hours.`;
    }
  }
  if (court.perPerson && input.people !== undefined && Number(input.people) < (court.minPeople || 1)) {
    return `Minimum ${court.minPeople} people for ${input.sport.toLowerCase()}`;
  }
  return null;
}

export function calculateBookingPrice(settings: SiteSettings, input: BookingPriceInput) {
  const court = getCourt(settings, input.sport);
  if (!court) return null;

  const weekend = isWeekendDate(settings, input.date);
  const hourlyRate = weekend ? court.weekend : court.weekday;
  const hours = bookingHours(court, input.slots);
  const people = bookingPeople(court, input.people);
  const slotTotal = Math.round(hourlyRate * hours * people);

  const extrasTotal = Object.entries(input.extras || {}).reduce((sum, [key, qty]) => {
    const extra = settings.extras.find((e) => e.key === key);
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    return sum + (extra ? extra.price * n : 0);
  }, 0);

  return {
    hourlyRate,
    hours,
    people,
    weekend,
    holiday: holidayOn(settings, input.date)?.name,
    slotTotal,
    extrasTotal,
    total: slotTotal + extrasTotal,
  };
}

/** Human price label for a court, e.g. "₹1,000 / 2 hrs (1 hr free)" or "₹50 per person / hr". */
export function courtPriceLabel(court: CourtPrice, which: "weekday" | "weekend"): string {
  const rate = court[which];
  const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (which === "weekday" && court.weekdayBlockHours && court.weekdayBlockHours > 1) {
    return `${rupees(rate * court.weekdayBlockHours)} / ${court.weekdayBlockHours} hrs (1 hr free)`;
  }
  if (court.perPerson) {
    const min = court.minPeople || 1;
    return `${rupees(rate)} per person / hr${min > 1 ? ` (${rupees(rate * min)} for ${min})` : ""}`;
  }
  return `${rupees(rate)} / hr${court.note ? ` · ${court.note}` : ""}`;
}

/** Parses "6:00 AM - 7:00 AM" or "06:00 - 07:00" and returns the start hour (fractional). */
export function slotStartHour(slot: string): number | null {
  const start = (slot || "").split("-")[0]?.trim();
  const match = start?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

export interface MembershipPriceInput {
  champType?: string;
  gender?: string;
  preferredTimeSlot?: string;
  preferredSport?: string;
  coachingProgram?: string; // CoachingProgram.key
  subscriptionType: string;
  mode?: string; // fixed/standard | flexible
}

/** Classes in the ₹600 programme ("fitness" key); members can pick them as their activity. */
export const CLASS_SPORTS = ["Yoga", "Taekwondo", "Karate", "Silambam", "Fitness", "Academic Tuition"];
/** Everything a member can choose as their main activity (User/Subscription/Attendance). */
export const MEMBER_SPORTS = ["Cricket", "Football", "Shuttle Badminton", ...CLASS_SPORTS, "Functions and Events", "Body Zorb"];

/** The member's coaching programme: chosen key, else the one for their sport, else the first. */
export function programFor(
  settings: SiteSettings,
  member?: { coachingProgram?: string; preferredSport?: string }
): CoachingProgram {
  const programs = settings.membership.programs;
  return (
    programs.find((p) => p.key === member?.coachingProgram) ||
    programs.find((p) => p.sport && p.sport === member?.preferredSport) ||
    (CLASS_SPORTS.includes(member?.preferredSport || "") && programs.find((p) => p.key === "fitness")) ||
    programs[0] ||
    // a new partner club may not have set up its programmes yet
    { key: "none", name: "Membership", monthly: 0 }
  );
}

/** Coaching fee for the member's programme and age group: monthly price × months. */
export function membershipPlanFor(settings: SiteSettings, input?: MembershipPriceInput): PlanPrices {
  const fee = programMonthlyFee(programFor(settings, input), input?.champType);
  return {
    monthly: fee,
    quarterly: fee * 3,
    "half yearly": fee * 6,
    yearly: fee * 12,
  };
}

export function calculateMembershipPrice(settings: SiteSettings, input: MembershipPriceInput): number {
  const type = (SUBSCRIPTION_TYPES as readonly string[]).includes(input.subscriptionType)
    ? (input.subscriptionType as SubscriptionType)
    : "monthly";
  const base = membershipPlanFor(settings, input)[type];
  const surcharge = input.mode === "flexible"
    ? settings.membership.flexibleSurchargePerMonth * SUBSCRIPTION_MONTHS[type]
    : 0;
  return base + surcharge;
}

/** Normalises a WhatsApp number to international format without '+', e.g. 919787020525. */
export function waNumber(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

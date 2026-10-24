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
  weekday: number; // per 30-minute slot (per hour for hourly sports)
  weekend: number;
  perHour: boolean; // true for Functions and Events (priced by session hours)
  active: boolean;
}

export interface Extra {
  key: string; // stable id, e.g. "ball"
  name: string;
  price: number;
}

export interface SiteSettings {
  courts: CourtPrice[];
  extras: Extra[];
  weekendDays: number[]; // 0 = Sunday … 6 = Saturday
  membership: {
    kids: PlanPrices;
    adultMale: PlanPrices;
    adultFemale: PlanPrices; // applies when the chosen slot is inside the women's window
    womenWindow: { startHour: number; endHour: number };
    flexibleSurchargePerMonth: number;
  };
  tournamentDefaultFee: number;
  upi: { vpa: string; payeeName: string };
  whatsappNumber: string; // 10-digit or with 91 prefix
}

export const DEFAULT_SETTINGS: SiteSettings = {
  courts: [
    { sport: "Cricket", weekday: 250, weekend: 400, perHour: false, active: true },
    { sport: "Football", weekday: 250, weekend: 400, perHour: false, active: true },
    { sport: "Shuttle Badminton", weekday: 400, weekend: 400, perHour: false, active: true },
    { sport: "Functions and Events", weekday: 2000, weekend: 2500, perHour: true, active: true },
    { sport: "Body Zorb", weekday: 1000, weekend: 1000, perHour: false, active: true },
  ],
  extras: [{ key: "ball", name: "Ball", price: 80 }],
  weekendDays: [0, 5, 6],
  membership: {
    kids: { monthly: 1500, quarterly: 4000, "half yearly": 8000, yearly: 13000 },
    adultMale: { monthly: 1199, quarterly: 3399, "half yearly": 6299, yearly: 11499 },
    adultFemale: { monthly: 799, quarterly: 2099, "half yearly": 4099, yearly: 8399 },
    womenWindow: { startHour: 10, endHour: 16 },
    flexibleSurchargePerMonth: 300,
  },
  tournamentDefaultFee: 600,
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
  const s = stored || {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    courts: s.courts?.length ? s.courts : DEFAULT_SETTINGS.courts,
    extras: s.extras ?? DEFAULT_SETTINGS.extras,
    weekendDays: s.weekendDays ?? DEFAULT_SETTINGS.weekendDays,
    membership: {
      ...DEFAULT_SETTINGS.membership,
      ...(s.membership || {}),
      womenWindow: { ...DEFAULT_SETTINGS.membership.womenWindow, ...(s.membership?.womenWindow || {}) },
    },
    upi: { ...DEFAULT_SETTINGS.upi, ...(s.upi || {}) },
  };
}

/** Weekday (0-6) of a yyyy-MM-dd date string, independent of server timezone. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

export function isWeekendDate(settings: SiteSettings, dateStr: string): boolean {
  return settings.weekendDays.includes(dayOfWeek(dateStr));
}

export function getCourt(settings: SiteSettings, sport: string): CourtPrice | undefined {
  return settings.courts.find((c) => c.sport === sport);
}

export interface BookingPriceInput {
  sport: string;
  date: string; // yyyy-MM-dd of the first slot
  slots: string[]; // all selected slots (both days)
  extras?: Record<string, number>; // extra key -> quantity
}

export function calculateBookingPrice(settings: SiteSettings, input: BookingPriceInput) {
  const court = getCourt(settings, input.sport);
  if (!court) return null;

  const weekend = isWeekendDate(settings, input.date);
  const unitPrice = weekend ? court.weekend : court.weekday;

  const units = court.perHour
    ? input.slots.reduce((sum, slot) => sum + (EVENT_SESSIONS.find((s) => s.time === slot)?.hours || 1), 0)
    : input.slots.length;

  const extrasTotal = Object.entries(input.extras || {}).reduce((sum, [key, qty]) => {
    const extra = settings.extras.find((e) => e.key === key);
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    return sum + (extra ? extra.price * n : 0);
  }, 0);

  return {
    unitPrice,
    units,
    weekend,
    slotTotal: unitPrice * units,
    extrasTotal,
    total: unitPrice * units + extrasTotal,
  };
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
  champType: string; // kids | adult | veteran
  gender?: string;
  preferredTimeSlot?: string;
  subscriptionType: string;
  mode?: string; // fixed/standard | flexible
}

export function membershipPlanFor(settings: SiteSettings, input: MembershipPriceInput): PlanPrices {
  const m = settings.membership;
  if (input.champType === "kids") return m.kids;
  if (input.gender === "female") {
    const start = input.preferredTimeSlot ? slotStartHour(input.preferredTimeSlot) : null;
    // No slot chosen yet → show the women's price; outside the window → regular price
    if (start === null || (start >= m.womenWindow.startHour && start < m.womenWindow.endHour)) {
      return m.adultFemale;
    }
  }
  return m.adultMale;
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

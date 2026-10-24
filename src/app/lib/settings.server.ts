import { connectToMongoose } from "@/app/server/mongodb";
import Settings from "@/app/models/Settings";
import {
  SiteSettings,
  SUBSCRIPTION_TYPES,
  withDefaults,
} from "@/app/lib/pricing";

const SETTINGS_KEY = "site";
const CACHE_MS = 60_000;

let cache: { value: SiteSettings; at: number } | null = null;

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  await connectToMongoose();
  const doc = await (Settings.findOne as any)({ key: SETTINGS_KEY }).lean();
  const value = withDefaults(doc?.data);
  cache = { value, at: Date.now() };
  return value;
}

export async function saveSiteSettings(value: SiteSettings, updatedBy: string): Promise<SiteSettings> {
  await connectToMongoose();
  await (Settings.findOneAndUpdate as any)(
    { key: SETTINGS_KEY },
    { $set: { data: value, updatedBy } },
    { upsert: true }
  );
  cache = { value, at: Date.now() };
  return value;
}

const isMoney = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1_000_000;
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{2,64}$/;

/** Validates an incoming settings object; returns a list of problems (empty = valid). */
export function validateSettings(s: SiteSettings): string[] {
  const errors: string[] = [];

  if (!Array.isArray(s.courts) || s.courts.length === 0) errors.push("At least one sport price is required");
  s.courts?.forEach((c) => {
    if (!c.sport?.trim()) errors.push("Every sport needs a name");
    if (!isMoney(c.weekday) || !isMoney(c.weekend)) errors.push(`${c.sport}: prices must be 0 or more`);
  });

  s.extras?.forEach((e) => {
    if (!e.key?.trim() || !e.name?.trim()) errors.push("Every extra needs a name");
    if (!isMoney(e.price)) errors.push(`${e.name}: price must be 0 or more`);
  });

  if (!Array.isArray(s.weekendDays) || s.weekendDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    errors.push("Weekend days are invalid");
  }

  (["kids", "adultMale", "adultFemale"] as const).forEach((plan) => {
    SUBSCRIPTION_TYPES.forEach((t) => {
      if (!isMoney(s.membership?.[plan]?.[t])) errors.push(`Membership ${plan} ${t} price is invalid`);
    });
  });
  const w = s.membership?.womenWindow;
  if (!w || !(w.startHour >= 0 && w.endHour <= 24 && w.startHour < w.endHour)) {
    errors.push("Women's discount hours are invalid");
  }
  if (!isMoney(s.membership?.flexibleSurchargePerMonth)) errors.push("Flexible surcharge is invalid");
  if (!isMoney(s.tournamentDefaultFee)) errors.push("Tournament fee is invalid");

  const names = (list: unknown) => Array.isArray(list) && list.length > 0 && list.every((x) => typeof x === "string" && x.trim().length > 0 && x.length <= 40);
  if (!names(s.expenses?.people)) errors.push("Add at least one person who pays expenses");
  if (!names(s.expenses?.categories)) errors.push("Add at least one expense category");

  if (!VPA_RE.test(s.upi?.vpa || "")) errors.push("UPI ID looks invalid (example: name@okaxis)");
  if (!s.upi?.payeeName?.trim()) errors.push("UPI payee name is required");

  const digits = (s.whatsappNumber || "").replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) {
    errors.push("WhatsApp number must be a 10-digit Indian mobile number");
  }

  return errors;
}

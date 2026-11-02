import { connectToMongoose } from "@/app/server/mongodb";
import Settings from "@/app/models/Settings";
import { SiteSettings, withDefaults } from "@/app/lib/pricing";

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
    if (c.weekdayBlockHours !== undefined && ![0, 1, 2, 3, 4].includes(Number(c.weekdayBlockHours))) {
      errors.push(`${c.sport}: weekday block must be 0–4 hours`);
    }
    if (c.perPerson && !(Number(c.minPeople) >= 1 && Number(c.maxPeople || 50) >= Number(c.minPeople))) {
      errors.push(`${c.sport}: check the minimum/maximum people`);
    }
  });

  if (!Array.isArray(s.holidays) || s.holidays.some((h) => !/^\d{4}-\d{2}-\d{2}$/.test(h?.date || "") || !String(h?.name || "").trim())) {
    errors.push("Every holiday needs a date and a name");
  }

  s.extras?.forEach((e) => {
    if (!e.key?.trim() || !e.name?.trim()) errors.push("Every extra needs a name");
    if (!isMoney(e.price)) errors.push(`${e.name}: price must be 0 or more`);
  });

  if (!Array.isArray(s.weekendDays) || s.weekendDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    errors.push("Weekend days are invalid");
  }

  if (!Array.isArray(s.membership?.programs) || s.membership.programs.length === 0) {
    errors.push("Add at least one coaching programme");
  }
  s.membership?.programs?.forEach((p) => {
    if (!p.key?.trim() || !p.name?.trim()) errors.push("Every coaching programme needs a name");
    if (!isMoney(p.monthly)) errors.push(`${p.name || "Programme"}: monthly fee is invalid`);
    if (p.adultMonthly !== undefined && !isMoney(p.adultMonthly)) errors.push(`${p.name || "Programme"}: adult fee is invalid`);
  });
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

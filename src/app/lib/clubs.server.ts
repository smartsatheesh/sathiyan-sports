import { connectToMongoose } from "@/app/server/mongodb";
import Club from "@/app/models/Club";
import { getSiteSettings, loadSettingsDoc, settingsKeyFor } from "@/app/lib/settings.server";
import { DEFAULT_SETTINGS, SiteSettings } from "@/app/lib/pricing";
import { ALL_FEATURES, DEFAULT_CLUB, isClubAdmin, isDefaultClub, PARTNER_DEFAULT_FEATURES, PublicClub } from "@/app/lib/clubs";

const DEFAULT_CLUB_NAME = "Sathiyan Multisport Club";
const PUBLIC_CACHE_MS = 30_000;
const publicCache = new Map<string, { value: PublicClub | null; at: number }>();

/** Call after a club is edited so its site picks up the change straight away. */
export function invalidatePublicClub(slug: string) {
  publicCache.delete(String(slug).toLowerCase());
}

/** All active partner clubs (not including Sathiyan). */
export async function listClubDocs(includeInactive = false) {
  await connectToMongoose();
  return (Club.find as any)(includeInactive ? {} : { active: true }).sort({ name: 1 }).lean();
}

export async function getClubDoc(slug: string) {
  if (isDefaultClub(slug)) return null;
  await connectToMongoose();
  return (Club.findOne as any)({ slug: String(slug).toLowerCase() }).lean();
}

/** True for Sathiyan and for any active partner club. */
export async function clubExists(slug?: string | null) {
  if (isDefaultClub(slug)) return true;
  const doc = await getClubDoc(slug!);
  return Boolean(doc?.active);
}

/**
 * A club's SiteSettings, so every price function works unchanged. Sathiyan's are the site
 * settings. A partner club's courts, extras, holidays etc. come from its own Settings document
 * (`club:<slug>`, edited at /admin/settings on its site) and start empty — never Sathiyan's
 * prices — while its programmes, UPI and WhatsApp always come from the Club document.
 */
export async function getClubSettings(slug?: string | null): Promise<SiteSettings> {
  if (isDefaultClub(slug)) return getSiteSettings();
  const club = await getClubDoc(slug!);
  if (!club) return getSiteSettings();
  const own = await loadSettingsDoc(settingsKeyFor(slug));
  const base: SiteSettings = own
    ? { ...own, courts: own.courts || [], extras: own.extras || [] }
    : { ...DEFAULT_SETTINGS, courts: [], extras: [], holidays: [] };
  return {
    ...base,
    membership: { programs: club.programs || [], flexibleSurchargePerMonth: own?.membership?.flexibleSurchargePerMonth ?? 0 },
    upi: { vpa: club.upi?.vpa || "", payeeName: club.upi?.payeeName || club.name },
    whatsappNumber: club.whatsappNumber || "",
  };
}

export async function getPublicClub(slug?: string | null): Promise<PublicClub | null> {
  const key = isDefaultClub(slug) ? DEFAULT_CLUB : String(slug).toLowerCase();
  const hit = publicCache.get(key);
  if (hit && Date.now() - hit.at < PUBLIC_CACHE_MS) return hit.value;
  const value = await buildPublicClub(key);
  publicCache.set(key, { value, at: Date.now() });
  return value;
}

async function buildPublicClub(slug: string): Promise<PublicClub | null> {
  if (isDefaultClub(slug)) {
    const s = await getSiteSettings();
    return {
      slug: DEFAULT_CLUB,
      name: DEFAULT_CLUB_NAME,
      city: "Madurai",
      tagline: "Football, cricket, badminton and martial arts under floodlights",
      color: "#071a2e",
      accentColor: "#ffc400",
      logoUrl: "/sathiyanlogo.png",
      isDefault: true,
      location: { address: "Perungudi, Madurai", mapUrl: "" },
      contact: { phone: "", email: "", instagram: "" },
      facilities: [],
      features: ALL_FEATURES,
      plan: "owner",
      whatsappNumber: s.whatsappNumber,
      upi: s.upi,
      programs: s.membership.programs.map(({ key, name, monthly, adultMonthly }) => ({ key, name, monthly, adultMonthly })),
    };
  }
  const c = await getClubDoc(slug);
  if (!c || !c.active) return null;
  return {
    slug: c.slug,
    name: c.name,
    city: c.city || "",
    tagline: c.tagline || "",
    color: c.color || "#1565c0",
    accentColor: c.accentColor || "#ffc400",
    logoUrl: c.hasLogo ? `/api/clubs/${c.slug}/logo?v=${new Date(c.updatedAt || 0).getTime()}` : null,
    isDefault: false,
    location: { address: c.location?.address || "", mapUrl: c.location?.mapUrl || "" },
    contact: { phone: c.contact?.phone || "", email: c.contact?.email || "", instagram: c.contact?.instagram || "" },
    facilities: (c.facilities || []).map((f: any) => ({ name: f.name, emoji: f.emoji || "🏟️", description: f.description || "" })),
    features: { ...PARTNER_DEFAULT_FEATURES, ...(c.features || {}) },
    plan: c.plan || "trial",
    whatsappNumber: c.whatsappNumber || "",
    upi: { vpa: c.upi?.vpa || "", payeeName: c.upi?.payeeName || c.name },
    programs: c.programs || [],
  };
}

/** Club names for dropdowns: Sathiyan first, then partner clubs A–Z. */
export async function listPublicClubs() {
  const docs = await listClubDocs();
  return [
    { slug: DEFAULT_CLUB, name: DEFAULT_CLUB_NAME, city: "Madurai" },
    ...docs.map((c: any) => ({ slug: c.slug, name: c.name, city: c.city || "" })),
  ];
}

/**
 * Which club an admin request acts on. Club admins are pinned to their own club whatever they
 * ask for; owner admins pick one (default Sathiyan). Returns null for anyone else.
 */
export function scopeClub(user: { role?: string; club?: string } | undefined, requested?: string | null): string | null {
  if (!user) return null;
  if (isClubAdmin(user.role)) return user.club || null;
  if (user.role === "admin") return requested && requested !== "all" ? requested.toLowerCase() : DEFAULT_CLUB;
  return null;
}

export class ClubError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const money = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
};

/**
 * Validates club fields from a form. `identity` (slug, ID prefix, active) can only be set by
 * the owner; club admins edit the rest of their own club.
 */
export function cleanClubInput(body: any, identity: boolean) {
  const out: Record<string, unknown> = {};
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  if (body.name !== undefined) {
    out.name = text(body.name, 80);
    if (!out.name) throw new ClubError("Club name is required");
  }
  if (body.city !== undefined) out.city = text(body.city, 60);
  if (body.tagline !== undefined) out.tagline = text(body.tagline, 160);
  if (body.color !== undefined && /^#[0-9a-f]{6}$/i.test(body.color)) out.color = body.color;
  if (body.accentColor !== undefined && /^#[0-9a-f]{6}$/i.test(body.accentColor)) out.accentColor = body.accentColor;
  if (body.location !== undefined) {
    const mapUrl = text(body.location?.mapUrl, 300);
    if (mapUrl && !/^https:\/\//.test(mapUrl)) throw new ClubError("Map link should start with https://");
    out.location = { address: text(body.location?.address, 200), mapUrl };
  }
  if (body.contact !== undefined) {
    const email = text(body.contact?.email, 120).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ClubError("Contact email looks wrong");
    out.contact = { phone: String(body.contact?.phone ?? "").replace(/[^\d+ ]/g, "").slice(0, 20), email, instagram: text(body.contact?.instagram, 60).replace(/^@/, "") };
  }
  if (body.facilities !== undefined) {
    if (!Array.isArray(body.facilities) || body.facilities.length > 20) throw new ClubError("Invalid facilities");
    out.facilities = body.facilities
      .map((f: any) => ({ name: text(f?.name, 60), emoji: text(f?.emoji, 8) || "🏟️", description: text(f?.description, 160) }))
      .filter((f: any) => f.name);
  }
  if (body.logo !== undefined) {
    if (body.logo === null || body.logo === "") {
      out.logo = undefined;
      out.hasLogo = false;
    } else {
      const img = String(body.logo);
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(img)) throw new ClubError("Logo must be a PNG, JPEG or WebP image");
      if (img.length > 200_000) throw new ClubError("Logo is too large (keep it under about 150 KB)");
      out.logo = img;
      out.hasLogo = true;
    }
  }
  if (body.whatsappNumber !== undefined) {
    const digits = String(body.whatsappNumber).replace(/\D/g, "");
    if (digits && digits.length !== 10 && digits.length !== 12) throw new ClubError("WhatsApp number should be 10 digits");
    out.whatsappNumber = digits;
  }
  if (body.upi !== undefined) {
    const vpa = text(body.upi?.vpa, 80);
    if (vpa && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) throw new ClubError("UPI ID looks wrong (example: clubname@okaxis)");
    out.upi = { vpa, payeeName: text(body.upi?.payeeName, 80) };
  }
  if (body.programs !== undefined) {
    if (!Array.isArray(body.programs) || body.programs.length > 20) throw new ClubError("Invalid programmes");
    out.programs = body.programs.map((p: any, i: number) => {
      const name = text(p?.name, 60);
      const monthly = money(p?.monthly);
      const adult = p?.adultMonthly === "" || p?.adultMonthly === undefined || p?.adultMonthly === null ? undefined : money(p.adultMonthly);
      if (!name || monthly === null || adult === null) throw new ClubError(`Programme ${i + 1}: name and fees are required`);
      return { key: text(p?.key, 40) || `p${i + 1}-${Date.now().toString(36)}`, name, monthly, ...(adult !== undefined && { adultMonthly: adult }) };
    });
  }
  if (identity) {
    if (body.slug !== undefined) {
      const slug = String(body.slug).toLowerCase().trim();
      if (!/^[a-z0-9-]{2,40}$/.test(slug) || slug === DEFAULT_CLUB) throw new ClubError("Web address: 2–40 letters, numbers or dashes");
      out.slug = slug;
    }
    if (body.features !== undefined && typeof body.features === "object") {
      out.features = Object.fromEntries(Object.keys(PARTNER_DEFAULT_FEATURES).map((k) => [k, Boolean(body.features?.[k])]));
    }
    if (body.plan !== undefined) {
      if (!["trial", "starter", "pro"].includes(body.plan)) throw new ClubError("Unknown plan");
      out.plan = body.plan;
    }
    if (body.planPaidTill !== undefined) out.planPaidTill = body.planPaidTill ? new Date(body.planPaidTill) : null;
    if (body.customDomain !== undefined) {
      const d = text(body.customDomain, 120).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (d && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new ClubError("Custom domain looks wrong (example: coolclub.com)");
      out.customDomain = d;
    }
    if (body.champIdPrefix !== undefined) {
      const prefix = String(body.champIdPrefix).toUpperCase().trim();
      if (!/^[A-Z]{2,4}$/.test(prefix)) throw new ClubError("Member ID prefix: 2–4 letters (S is Sathiyan's)");
      out.champIdPrefix = prefix;
    }
    if (body.active !== undefined) out.active = Boolean(body.active);
  }
  return out;
}
